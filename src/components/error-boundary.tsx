"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Without this, a render error anywhere in the builder unmounts the whole tree
 * and leaves a blank page with no indication of what happened.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("builder crashed", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <div className="text-sm font-medium text-fg">Something broke while rendering this page.</div>
        <pre className="max-w-xl overflow-auto rounded-lg border border-border bg-surface-2 p-3 text-left text-[11px] text-fg-secondary">
          {error.message}
        </pre>
        <button
          onClick={() => this.setState({ error: null })}
          className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg transition-colors hover:bg-surface-3"
        >
          Try again
        </button>
      </div>
    );
  }
}
