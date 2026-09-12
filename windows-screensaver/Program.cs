using System.Globalization;
using System.Threading;
using System.Diagnostics;
using System;

namespace PhotoWall.Screensaver;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var launchMode = LaunchModeParser.Parse(args);

        switch (launchMode.Mode)
        {
            case ScreensaverMode.Configure:
                MessageBox.Show(
                    "No extra settings yet.\n\nUse your normal web controls while previewing the screensaver.",
                    "Photo Wall Screensaver",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                return;

            case ScreensaverMode.Preview:
                if (launchMode.PreviewHandle == IntPtr.Zero)
                {
                    return;
                }

                Application.Run(new ScreensaverForm(
                    Screen.PrimaryScreen?.Bounds ?? Rectangle.Empty,
                    isPreview: true,
                    previewParentHandle: launchMode.PreviewHandle,
                    enableWebView: false));
                return;

            default:
                break;
        }

        using var singleInstanceMutex = new Mutex(
            initiallyOwned: true,
            name: @"Global\PhotoWallScreensaver_Run",
            createdNew: out var isPrimaryInstance);

        if (!isPrimaryInstance)
        {
            return;
        }

        ScreensaverProcessCleanup.TerminateSiblingInstances();

        var forms = Screen.AllScreens
            .Select(screen => new ScreensaverForm(
                screen.Bounds,
                isPreview: false,
                previewParentHandle: IntPtr.Zero,
                enableWebView: true))
            .Cast<Form>()
            .ToArray();

        Application.Run(new ScreensaverContext(forms));
    }
}

internal sealed class ScreensaverContext : ApplicationContext
{
    private readonly Form[] _forms;
    private bool _isClosingAll;
    private int _openForms;
    private int _shutdownRequested;

    public ScreensaverContext(IReadOnlyCollection<Form> forms)
    {
        _forms = forms.ToArray();
        _openForms = forms.Count;

        foreach (var form in _forms)
        {
            form.FormClosed += HandleFormClosed;
            form.Show();
        }
    }

    private void HandleFormClosed(object? sender, FormClosedEventArgs e)
    {
        if (!_isClosingAll)
        {
            _isClosingAll = true;
            ScreensaverProcessCleanup.TerminateSiblingInstances();
            foreach (var form in _forms)
            {
                if (!ReferenceEquals(form, sender) && !form.IsDisposed)
                {
                    form.Close();
                }
            }
        }

        if (Interlocked.Decrement(ref _openForms) <= 0)
        {
            ExitThread();
        }
    }

    protected override void ExitThreadCore()
    {
        if (Interlocked.Exchange(ref _shutdownRequested, 1) != 0)
        {
            return;
        }

        ScreensaverProcessCleanup.TerminateSiblingInstances();
        base.ExitThreadCore();
        Environment.Exit(0);
    }
}

internal static class ScreensaverProcessCleanup
{
    public static void TerminateSiblingInstances()
    {
        try
        {
            var current = Process.GetCurrentProcess();
            var currentExe = current.MainModule?.FileName;
            var processName = current.ProcessName;

            foreach (var process in Process.GetProcessesByName(processName))
            {
                try
                {
                    if (process.Id == current.Id)
                    {
                        continue;
                    }

                    if (!IsSameExecutable(process, currentExe))
                    {
                        continue;
                    }

                    process.Kill(entireProcessTree: true);
                    process.WaitForExit(1000);
                }
                catch
                {
                    // Best effort: another instance may already be exiting.
                }
                finally
                {
                    process.Dispose();
                }
            }
        }
        catch
        {
            // Best-effort process cleanup.
        }
    }

    private static bool IsSameExecutable(Process other, string? currentExe)
    {
        if (string.IsNullOrWhiteSpace(currentExe))
        {
            return true;
        }

        try
        {
            var otherExe = other.MainModule?.FileName;
            return string.Equals(otherExe, currentExe, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }
}

internal enum ScreensaverMode
{
    Run,
    Preview,
    Configure
}

internal readonly record struct LaunchMode(ScreensaverMode Mode, IntPtr PreviewHandle);

internal static class LaunchModeParser
{
    public static LaunchMode Parse(string[] args)
    {
        if (args.Length == 0)
        {
            return new LaunchMode(ScreensaverMode.Run, IntPtr.Zero);
        }

        var first = args[0].Trim();
        if (string.IsNullOrWhiteSpace(first))
        {
            return new LaunchMode(ScreensaverMode.Run, IntPtr.Zero);
        }

        var normalized = first.StartsWith("-", StringComparison.Ordinal)
            ? "/" + first[1..]
            : first;

        var command = normalized.Length >= 2 ? char.ToLowerInvariant(normalized[1]) : '\0';

        if (command == 'c')
        {
            return new LaunchMode(ScreensaverMode.Configure, IntPtr.Zero);
        }

        if (command == 'p')
        {
            if (TryExtractHandle(args, normalized, out var handle))
            {
                return new LaunchMode(ScreensaverMode.Preview, handle);
            }

            return new LaunchMode(ScreensaverMode.Run, IntPtr.Zero);
        }

        return new LaunchMode(ScreensaverMode.Run, IntPtr.Zero);
    }

    private static bool TryExtractHandle(IReadOnlyList<string> args, string firstArg, out IntPtr handle)
    {
        string? handleText = null;

        var colonIndex = firstArg.IndexOf(':');
        if (colonIndex >= 0 && colonIndex < firstArg.Length - 1)
        {
            handleText = firstArg[(colonIndex + 1)..];
        }
        else if (args.Count > 1)
        {
            handleText = args[1];
        }

        if (long.TryParse(handleText, NumberStyles.Integer, CultureInfo.InvariantCulture, out var rawHandle))
        {
            handle = new IntPtr(rawHandle);
            return handle != IntPtr.Zero;
        }

        handle = IntPtr.Zero;
        return false;
    }
}
