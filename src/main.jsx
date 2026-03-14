import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:'20px',background:'#1a1a2e',color:'#ff6b6b',fontFamily:'monospace',minHeight:'100vh'}}>
          <h2 style={{color:'#ff6b6b'}}>Runtime Error</h2>
          <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all',background:'#0d0d1a',padding:'16px',borderRadius:'8px',color:'#ffd700',fontSize:'12px'}}>
            {this.state.error.toString()}
          </pre>
          <h3 style={{color:'#ff6b6b',marginTop:'20px'}}>Component Stack</h3>
          <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all',background:'#0d0d1a',padding:'16px',borderRadius:'8px',color:'#90ee90',fontSize:'11px'}}>
            {this.state.info && this.state.info.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>
);
