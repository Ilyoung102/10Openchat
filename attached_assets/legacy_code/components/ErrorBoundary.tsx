
import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-gray-100 p-6 text-center">
          <div className="bg-red-900/20 p-4 rounded-full mb-4">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">오류가 발생했습니다</h1>
          <p className="text-gray-400 mb-6 max-w-md">
            앱 실행 중 예기치 않은 문제가 발생했습니다.<br/>
            API 키 설정이나 네트워크 연결을 확인해 주세요.
          </p>
          <div className="bg-[#1e1e1e] p-4 rounded-lg border border-gray-800 text-left w-full max-w-lg overflow-auto max-h-48 mb-6">
            <p className="text-red-400 font-mono text-xs whitespace-pre-wrap">
              {this.state.error?.toString()}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            앱 다시 시작
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
