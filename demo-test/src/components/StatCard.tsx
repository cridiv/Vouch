interface StatCardProps {
  label: string;
  value: string | number;
  color?: 'blue' | 'red' | 'green' | 'yellow';
}

export function StatCard({ label, value, color = 'blue' }: StatCardProps) {
  const colors = {
    blue: 'text-blue-500',
    red: 'text-red-500',
    green: 'text-green-500',
    yellow: 'text-yellow-500',
  };
  
  return (
    <div className="bg-gray-900 border border-gray-800 p-4 rounded text-center">
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}