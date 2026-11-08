import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { Desktop } from './ui/Desktop';
import './ui/styles.css';
import './ui/legacy.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('界面异常', error, info.componentStack);
  }
  render() {
    return this.state.error ? (
      <div className="fatal-error">
        <h1>桌面遇到了一个问题</h1>
        <p>{this.state.error}</p>
        <p>刷新不会删除已保存的本地进度。</p>
        <button className="button" onClick={() => location.reload()}>
          重新打开桌面
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
// 入口模块热更新时复用同一个根，避免重复绑定导致旧界面和新状态交错。
const root =
  import.meta.hot?.data.reactRoot ?? ReactDOM.createRoot(document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.data.reactRoot = root;
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Desktop />
    </ErrorBoundary>
  </React.StrictMode>,
);
