import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CarInfo] uncaught render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[50vh] bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold tracking-tight mb-3">Something went wrong</h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-8">
            This page hit an unexpected error. Your garage and compare list on this device are
            unchanged. Try again, or go back to search.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
            <Link to="/home" className="btn-secondary text-xs">
              Search
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
