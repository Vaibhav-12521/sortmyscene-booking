import { Component } from 'react';

/**
 * Catches render-time errors anywhere below it and shows a recoverable message
 * instead of a blank white screen. Without this, a single thrown error unmounts
 * the whole React tree.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="errorbox">
          <div className="card errorbox__card">
            <h1>Something went wrong</h1>
            <p>The page hit an unexpected error. You can retry or reload.</p>
            <pre className="errorbox__detail">{String(this.state.error?.message || this.state.error)}</pre>
            <div className="errorbox__actions">
              <button className="btn btn--primary" onClick={this.handleReset}>Try again</button>
              <button className="btn btn--ghost" onClick={() => window.location.assign('/')}>
                Reload app
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
