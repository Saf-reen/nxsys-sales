import { Component, type ErrorInfo, type ReactNode } from 'react';
import logger from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const showDetails = Boolean(import.meta.env.DEV);

      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 m-4">
          <h2 className="text-2xl font-bold text-red-900 mb-4">Something went wrong</h2>
          {showDetails ? (
            <details className="text-sm text-red-700 whitespace-pre-wrap mb-4">
              <summary className="cursor-pointer font-semibold mb-2">Error Details</summary>
              {this.state.error && (
                <div className="mt-2 bg-white p-3 rounded border border-red-200">
                  <p className="font-mono text-xs">{this.state.error.toString()}</p>
                </div>
              )}
            </details>
          ) : (
            <p className="mb-4 text-sm text-red-700">
              An unexpected error occurred. Please reload the page and try again.
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-red-600 text-white px-4 py-2 hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
