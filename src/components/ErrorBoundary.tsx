import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw, Trash2 } from 'lucide-react';

/**
 * Without this, a single render error unmounts the whole React tree and leaves
 * a blank screen with no navigation — the app looks frozen and the only way out
 * is force-quitting it. Anything that throws should still leave the user a way
 * back.
 */

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reload = (): void => {
    window.location.reload();
  };

  /** Escape hatch for a poisoned cache or corrupt local settings. */
  private resetAndReload = async (): Promise<void> => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      // Deliberately scoped: clearing everything would sign the user out.
      localStorage.removeItem('dt.settings.v1');
    } catch (err) {
      console.error('[ErrorBoundary] reset failed', err);
    }
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
        <div className="w-full max-w-sm bg-surface border border-border rounded-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-clay mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display font-bold text-lg text-text">
                Something broke
              </h1>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                The app hit an unexpected error. Your saved data is safe.
                Reloading usually fixes it.
              </p>
            </div>
          </div>

          <pre className="text-xs font-mono text-muted bg-surface-2 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-32">
            {error.message || String(error)}
          </pre>

          <div className="space-y-2">
            <button
              onClick={this.reload}
              className="pill-btn w-full bg-accent text-bg hover:bg-accent-hover"
              data-testid="button-error-reload"
            >
              <RotateCw size={16} className="mr-2" /> Reload the app
            </button>
            <button
              onClick={() => void this.resetAndReload()}
              className="pill-btn w-full bg-surface-2 text-text border border-border"
              data-testid="button-error-reset"
            >
              <Trash2 size={16} className="mr-2" /> Clear cache and reload
            </button>
          </div>

          <p className="text-xs text-muted text-center">
            Still stuck? Clear cache and reload rebuilds the app from scratch.
            You will stay signed in.
          </p>
        </div>
      </div>
    );
  }
}
