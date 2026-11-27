import { Component, type ReactNode } from 'react';
import { clearRun } from './save';

/** If a render ever crashes (e.g. a stale save), offer a fresh run instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="app">
        <div className="panel">
          <h2>Something broke</h2>
          <p className="muted">{this.state.error.message}</p>
          <button
            className="end-turn"
            onClick={() => {
              clearRun();
              location.reload();
            }}
          >
            Start a new run
          </button>
        </div>
      </main>
    );
  }
}
