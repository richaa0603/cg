import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="eb-shell">
          <div className="eb-card">
            <div className="eb-icon">⚠</div>
            <h2 className="eb-title">Something went wrong</h2>
            <p className="eb-message">{this.state.error?.message ?? "An unexpected error occurred."}</p>
            <button type="button" className="exec-retry-btn" onClick={this.reset}>
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
