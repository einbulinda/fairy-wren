import { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Error Boundary for POS
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the app
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error("POS Error Boundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.handleReset();
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-red-500/50 rounded-xl p-6 max-w-md w-full">
            <div className="text-center">
              <AlertTriangle size={56} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                POS Error
              </h2>
              <p className="text-gray-400 mb-6">
                Something went wrong. Your work has been saved. Please reload to continue.
              </p>

              {/* Error details (collapsible in production) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="bg-gray-900 rounded-lg p-3 mb-4 text-left">
                  <p className="text-red-400 text-sm font-mono break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-gray-500 text-xs mt-2 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  <RefreshCw size={20} />
                  Reload POS
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <Home size={18} />
                    Go to Home
                  </button>

                  <button
                    onClick={this.handleReset}
                    className="flex items-center justify-center gap-2 flex-1 px-4 py-2 border border-gray-600 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>

              {/* Support info */}
              <p className="text-gray-500 text-xs mt-6">
                If this keeps happening, contact support with error details.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
