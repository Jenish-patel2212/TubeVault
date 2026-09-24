import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("TubeVault App Caught Error:", error, errorInfo);
  }

  public handleReset = () => {
    localStorage.removeItem('tubevault_user_plan');
    sessionStorage.removeItem('tubevault_admin_token');
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto bg-red-600/20 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/30">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">TubeVault Recovery</h2>
            <p className="text-xs text-neutral-400">
              {this.state.error?.message || "An unexpected rendering error occurred."}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-lg shadow-red-600/30"
            >
              Reload TubeVault Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
