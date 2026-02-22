import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught:', error, info);
    this.setState({ info: info });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const name = this.props.name || 'This page';
    return (
      <div className='min-h-64 flex items-center justify-center p-8'>
        <div className='bg-white rounded-2xl shadow-sm border border-red-100 p-8 max-w-md w-full text-center'>
          <div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <AlertTriangle size={24} className='text-red-500' />
          </div>
          <h3 className='font-bold text-gray-900 mb-2'>{name} failed to load</h3>
          <p className='text-sm text-gray-500 mb-4'>
            {this.state.error ? this.state.error.message : 'An unexpected error occurred.'}
          </p>
          <button
            onClick={function() { window.location.reload(); }}
            className='flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700'>
            <RefreshCw size={14} /> Reload
          </button>
        </div>
      </div>
    );
  }
}