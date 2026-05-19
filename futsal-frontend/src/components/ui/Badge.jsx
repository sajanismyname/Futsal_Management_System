const statusStyles = {
  pending:           'bg-tint-yellow text-brand-brown',
  confirmed:         'bg-tint-mint text-success',
  cancelled:         'bg-tint-rose text-error',
  expired:           'bg-gray-100 text-steel',
  paid:              'bg-tint-mint text-success',
  unpaid:            'bg-tint-peach text-brand-orange-deep',
  refunded:          'bg-tint-sky text-link-blue',
  upcoming:          'bg-tint-sky text-link-blue',
  ongoing:           'bg-tint-lavender text-primary',
  completed:         'bg-gray-100 text-charcoal',
  registration_open: 'bg-tint-mint text-success',
  active:            'bg-tint-mint text-success',
  suspended:         'bg-tint-rose text-error',
  approved:          'bg-tint-mint text-success',
  rejected:          'bg-tint-rose text-error',
  owner:             'bg-tint-lavender text-brand-purple-800',
  customer:          'bg-tint-sky text-link-blue',
  admin:             'bg-primary text-on-primary',
  scheduled:         'bg-tint-sky text-link-blue',
};

const Badge = ({ status, label, className = '' }) => {
  const cls = statusStyles[status] || 'bg-gray-50 text-slate border border-hairline';
  return (
    <span className={`inline-flex items-center text-[12px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${cls} ${className}`}>
      {(label || status || '').replace('_', ' ')}
    </span>
  );
};

export default Badge;
