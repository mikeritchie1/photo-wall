using System.Runtime.InteropServices;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace PhotoWall.Screensaver;

internal sealed class ScreensaverForm : Form
{
    private const string AppHostName = "appassets.local";
    private static readonly SemaphoreSlim InitGate = new(1, 1);

    private readonly Rectangle _targetBounds;
    private readonly bool _isPreview;
    private readonly IntPtr _previewParentHandle;
    private readonly bool _enableWebView;
    private readonly WebView2 _webView;
    private System.Windows.Forms.Timer? _inputMonitorTimer;
    private Point _lastMousePosition;
    private uint _lastInputTick;
    private bool _exitOnInputArmed;

    public ScreensaverForm(Rectangle targetBounds, bool isPreview, IntPtr previewParentHandle, bool enableWebView)
    {
        _targetBounds = targetBounds;
        _isPreview = isPreview;
        _previewParentHandle = previewParentHandle;
        _enableWebView = enableWebView;
        _webView = new WebView2 { Dock = DockStyle.Fill };

        BackColor = Color.Black;
        StartPosition = FormStartPosition.Manual;

        if (_enableWebView)
        {
            Controls.Add(_webView);
        }
        else
        {
            Controls.Add(new Label
            {
                Dock = DockStyle.Fill,
                ForeColor = Color.White,
                BackColor = Color.Black,
                TextAlign = ContentAlignment.MiddleCenter,
                Text = "Photo Wall Screensaver"
            });
        }

        if (_isPreview)
        {
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
        }
        else
        {
            FormBorderStyle = FormBorderStyle.None;
            Bounds = _targetBounds;
            ShowInTaskbar = false;
            TopMost = true;
            KeyPreview = true;
            KeyDown += (_, _) => RequestClose();
            MouseDown += (_, _) => RequestClose();
            MouseMove += HandleMouseMoveExit;
            _webView.PreviewKeyDown += (_, _) => RequestClose();
            _webView.MouseDown += (_, _) => RequestClose();
        }

        Shown += HandleShown;
        FormClosed += (_, _) =>
        {
            _inputMonitorTimer?.Stop();
            _inputMonitorTimer?.Dispose();
            _inputMonitorTimer = null;
            _webView.Dispose();

            if (!_isPreview)
            {
                Cursor.Show();
            }
        };
    }

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        if (_enableWebView)
        {
            await InitializeWebViewAsync();
        }
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);

        if (!_isPreview || _previewParentHandle == IntPtr.Zero)
        {
            return;
        }

        NativeMethods.SetParent(Handle, _previewParentHandle);
        var style = NativeMethods.GetWindowStyle(Handle).ToInt64();
        NativeMethods.SetWindowStyle(Handle, new IntPtr(style | NativeMethods.WsChild));

        if (NativeMethods.GetClientRect(_previewParentHandle, out var rect))
        {
            Location = new Point(0, 0);
            Size = new Size(rect.Right - rect.Left, rect.Bottom - rect.Top);
        }
    }

    private void HandleShown(object? sender, EventArgs e)
    {
        if (_isPreview)
        {
            return;
        }

        Cursor.Hide();
        _lastMousePosition = Cursor.Position;
        _lastInputTick = NativeMethods.GetLastInputTick();

        _inputMonitorTimer = new System.Windows.Forms.Timer { Interval = 100 };
        _inputMonitorTimer.Tick += (_, _) =>
        {
            if (!_exitOnInputArmed)
            {
                return;
            }

            var current = Cursor.Position;
            if (Math.Abs(current.X - _lastMousePosition.X) > 2 || Math.Abs(current.Y - _lastMousePosition.Y) > 2)
            {
                RequestClose();
                return;
            }

            var latestInputTick = NativeMethods.GetLastInputTick();
            if (latestInputTick != 0 && latestInputTick != _lastInputTick)
            {
                RequestClose();
            }
        };
        _inputMonitorTimer.Start();

        var armTimer = new System.Windows.Forms.Timer { Interval = 500 };
        armTimer.Tick += (_, _) =>
        {
            _lastMousePosition = Cursor.Position;
            _lastInputTick = NativeMethods.GetLastInputTick();
            _exitOnInputArmed = true;
            armTimer.Stop();
            armTimer.Dispose();
        };
        armTimer.Start();
    }

    private void HandleMouseMoveExit(object? sender, MouseEventArgs e)
    {
        if (!_exitOnInputArmed)
        {
            return;
        }

        var current = Cursor.Position;
        if (Math.Abs(current.X - _lastMousePosition.X) > 3 || Math.Abs(current.Y - _lastMousePosition.Y) > 3)
        {
            RequestClose();
        }
    }

    private void RequestClose()
    {
        if (IsDisposed || Disposing)
        {
            return;
        }

        Close();
    }

    private async Task InitializeWebViewAsync()
    {
        try
        {
            await InitGate.WaitAsync();
            try
            {
                var environment = await CreateEnvironmentAsync();
                await _webView.EnsureCoreWebView2Async(environment);

                ConfigureWebViewSettings(_webView.CoreWebView2);
                if (!NavigateToLocalContent())
                {
                    return;
                }
            }
            finally
            {
                InitGate.Release();
            }
        }
        catch (Exception ex)
        {
            if (IsDisposed || Disposing)
            {
                return;
            }

            try
            {
                await InitGate.WaitAsync();
                try
                {
                    if (IsDisposed || Disposing)
                    {
                        return;
                    }

                // Fallback path: use default environment if custom shared one fails.
                    await _webView.EnsureCoreWebView2Async();
                    ConfigureWebViewSettings(_webView.CoreWebView2);
                    if (!NavigateToLocalContent())
                    {
                        return;
                    }
                }
                finally
                {
                    InitGate.Release();
                }
            }
            catch (Exception fallbackEx)
            {
                ShowError(
                    "Failed to initialize WebView2.\n\n" +
                    $"Primary: {ex.GetType().Name} (0x{ex.HResult:X8})\n{ex.Message}\n\n" +
                    $"Fallback: {fallbackEx.GetType().Name} (0x{fallbackEx.HResult:X8})\n{fallbackEx.Message}");
            }
        }
    }

    private bool NavigateToLocalContent()
    {
        var webRoot = Path.Combine(AppContext.BaseDirectory, "web");
        var indexPath = Path.Combine(webRoot, "index.html");
        if (!File.Exists(indexPath))
        {
            ShowError($"Unable to find web content at:\n{indexPath}");
            return false;
        }

        _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            AppHostName,
            webRoot,
            CoreWebView2HostResourceAccessKind.Allow);

        _webView.Source = new Uri($"https://{AppHostName}/index.html");
        return true;
    }

    private static async Task<CoreWebView2Environment> CreateEnvironmentAsync()
    {
        var baseUserData = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "PhotoWallScreensaver",
            "WebView2");

        Directory.CreateDirectory(baseUserData);

        // Use a per-process profile to avoid stale/locked profile state (0x8007139F).
        var processUserData = Path.Combine(baseUserData, $"session-{Environment.ProcessId}");
        Directory.CreateDirectory(processUserData);

        CleanupOldProfiles(baseUserData, keepFolderName: Path.GetFileName(processUserData));

        var options = new CoreWebView2EnvironmentOptions
        {
            AdditionalBrowserArguments = "--disable-features=RendererCodeIntegrity"
        };

        return await CoreWebView2Environment.CreateAsync(
            browserExecutableFolder: null,
            userDataFolder: processUserData,
            options: options);
    }

    private static void CleanupOldProfiles(string baseFolder, string keepFolderName)
    {
        try
        {
            var cutoff = DateTime.UtcNow.AddDays(-2);
            foreach (var dir in Directory.EnumerateDirectories(baseFolder, "session-*"))
            {
                var name = Path.GetFileName(dir);
                if (string.Equals(name, keepFolderName, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var lastWriteUtc = Directory.GetLastWriteTimeUtc(dir);
                if (lastWriteUtc < cutoff)
                {
                    try
                    {
                        Directory.Delete(dir, recursive: true);
                    }
                    catch
                    {
                        // Ignore cleanup failures for in-use folders.
                    }
                }
            }
        }
        catch
        {
            // Best-effort cleanup only.
        }
    }

    private void ConfigureWebViewSettings(CoreWebView2 coreWebView2)
    {
        coreWebView2.Settings.AreDevToolsEnabled = false;
        coreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        coreWebView2.Settings.IsStatusBarEnabled = false;
        coreWebView2.Settings.IsZoomControlEnabled = false;
    }

    private void ShowError(string message)
    {
        _webView.Visible = false;

        var label = new Label
        {
            Dock = DockStyle.Fill,
            ForeColor = Color.White,
            BackColor = Color.Black,
            TextAlign = ContentAlignment.MiddleCenter,
            Text = message
        };

        Controls.Add(label);
        label.BringToFront();
    }
}

internal static class NativeMethods
{
    public const int GwlStyle = -16;
    public const int WsChild = 0x40000000;

    [DllImport("user32.dll")]
    public static extern IntPtr SetParent(IntPtr childHandle, IntPtr newParentHandle);

    [DllImport("user32.dll")]
    public static extern bool GetClientRect(IntPtr handle, out Rect rect);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool GetLastInputInfo(ref LastInputInfo plii);

    [DllImport("user32.dll", EntryPoint = "GetWindowLong")]
    private static extern int GetWindowLong32(IntPtr handle, int index);

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr")]
    private static extern IntPtr GetWindowLongPtr64(IntPtr handle, int index);

    [DllImport("user32.dll", EntryPoint = "SetWindowLong")]
    private static extern int SetWindowLong32(IntPtr handle, int index, int newStyle);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr")]
    private static extern IntPtr SetWindowLongPtr64(IntPtr handle, int index, IntPtr newStyle);

    public static IntPtr GetWindowStyle(IntPtr handle)
    {
        return IntPtr.Size == 8
            ? GetWindowLongPtr64(handle, GwlStyle)
            : new IntPtr(GetWindowLong32(handle, GwlStyle));
    }

    public static IntPtr SetWindowStyle(IntPtr handle, IntPtr newStyle)
    {
        return IntPtr.Size == 8
            ? SetWindowLongPtr64(handle, GwlStyle, newStyle)
            : new IntPtr(SetWindowLong32(handle, GwlStyle, newStyle.ToInt32()));
    }

    public static uint GetLastInputTick()
    {
        var info = new LastInputInfo
        {
            CbSize = (uint)Marshal.SizeOf<LastInputInfo>()
        };

        return GetLastInputInfo(ref info) ? info.DwTime : 0;
    }
}

[StructLayout(LayoutKind.Sequential)]
internal struct Rect
{
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
}

[StructLayout(LayoutKind.Sequential)]
internal struct LastInputInfo
{
    public uint CbSize;
    public uint DwTime;
}
