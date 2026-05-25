import { Component } from 'react';

function formatError(error) {
  if (!error) return 'שגיאה לא ידועה';
  if (typeof error === 'string') return error;
  const parts = [error.name, error.message].filter(Boolean);
  if (parts.length) return parts.join(': ');
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, componentStack: '' };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const componentStack = info?.componentStack || '';
    this.setState({ componentStack });
    console.error('App crash:', error, info);
    try {
      localStorage.setItem(
        'sharecharge-last-crash',
        JSON.stringify({
          at: Date.now(),
          message: formatError(error),
          stack: error?.stack || '',
          componentStack,
        }),
      );
    } catch {
      /* ignore storage errors */
    }
  }

  render() {
    if (this.state.error) {
      const detail = formatError(this.state.error);
      const stack = this.state.error?.stack || '';
      const componentStack = this.state.componentStack || '';

      return (
        <div dir="rtl" style={{ padding: 24, fontFamily: 'system-ui', background: '#f5f8fa', minHeight: '100vh' }}>
          <h1 style={{ color: '#c62828', fontSize: 20, marginBottom: 12 }}>שגיאה בטעינת האפליקציה</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#333', fontWeight: 700 }}>{detail}</p>
          {(stack || componentStack) && (
            <pre
              style={{
                marginTop: 16,
                padding: 12,
                fontSize: 11,
                lineHeight: 1.5,
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: 8,
                overflow: 'auto',
                maxHeight: 220,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                direction: 'ltr',
                textAlign: 'left',
              }}
            >
              {[stack, componentStack].filter(Boolean).join('\n\n--- component stack ---\n')}
            </pre>
          )}
          <button
            type="button"
            style={{ marginTop: 16, padding: '12px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700 }}
            onClick={() => window.location.reload()}
          >
            נסה שוב
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
