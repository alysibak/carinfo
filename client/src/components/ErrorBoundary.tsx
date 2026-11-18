import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { reportError } from '../utils/errorReporting';
import { t } from '../i18n';

interface Props {
  children: ReactNode;
  /**
   * Shown in place of the children when they fail, instead of the full-page
   * error. For a part of a page the rest can do without, such as the home
   * page's counts: one widget reading a field its response lacked took the
   * whole home page down.
   */
  fallback?: ReactNode;
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
    reportError(error, 'boundary', { componentStack: info.componentStack });
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    // With no connection, a page whose code was never stored cannot load: say
    // so, and point at the page that works without one.
    const offline = !navigator.onLine;
    return (
      <div className="min-h-[50vh] bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="page-title mb-3">
            {offline ? t('No connection') : t('Something went wrong')}
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-8">
            {offline
              ? t(
                  'This page needs a connection to load. The VIN page and its camera work without one.',
                )
              : t(
                  'This page hit an unexpected error. Your garage and compare list on this device are unchanged. Try again, or go back to search.',
                )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="btn-primary"
              // A page's code that failed to load stays failed until the page reloads.
              onClick={() => (offline ? window.location.reload() : this.setState({ error: null }))}
            >
              {t('Try again')}
            </button>
            <Link to={offline ? '/vin' : '/home'} className="btn-secondary">
              {offline ? t('VIN page') : t('Search')}
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
