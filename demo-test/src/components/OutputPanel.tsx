interface OutputPanelProps {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'green' | 'amber' | 'red';
  children: React.ReactNode;
}

export function OutputPanel({ variant = 'default', children }: OutputPanelProps) {
  const styles = {
    default: 'border-gray-700 bg-gray-900 text-gray-300',
    success: 'border-green-600 bg-green-950/30 text-green-400',
    error: 'border-red-600 bg-red-950/30 text-red-400',
    warning: 'border-yellow-600 bg-yellow-950/30 text-yellow-400',
    green: 'border-green-600 bg-green-950/50 text-green-400',
    amber: 'border-yellow-600 bg-yellow-950/50 text-yellow-400',
    red: 'border-red-600 bg-red-950/50 text-red-400',
  };
  
  return (
    <div className={`border p-4 rounded font-mono text-xs whitespace-pre-wrap min-h-[80px] ${styles[variant]}`}>
      {children}
    </div>
  );
}