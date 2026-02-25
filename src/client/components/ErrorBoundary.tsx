import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2">Помилка</h1>
            <p className="text-red-400 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 rounded bg-slate-600 hover:bg-slate-500"
            >
              Спробувати знову
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
