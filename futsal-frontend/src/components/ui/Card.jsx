const Card = ({ children, className = '', padding = 'p-6' }) => (
  <div className={`card ${padding} ${className}`}>
    {children}
  </div>
);

export const StatCard = ({ label, value, icon, tint = 'bg-gray-50' }) => (
  <div className={`rounded-xl p-5 ${tint}`}>
    {icon && <div className="mb-3">{icon}</div>}
    <p className="text-2xl font-semibold text-ink-deep">{value}</p>
    <p className="text-sm text-slate mt-1">{label}</p>
  </div>
);

export default Card;
