import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './templates.css';
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal">
        <h1>Ish maydonini ochib bo‘lmadi</h1>
        <p>Mahalliy loyihalaringiz saqlangan. Sahifani qayta yuklang.</p>
        <button onClick={() => location.reload()}>Qayta urinish</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
