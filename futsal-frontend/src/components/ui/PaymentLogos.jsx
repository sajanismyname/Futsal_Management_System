export const KhaltiLogo = ({ className = "w-9 h-9" }) => (
  <div className={`relative flex items-center justify-center rounded-xl overflow-hidden shadow-sm flex-shrink-0 ${className}`} style={{ backgroundColor: '#5c2d91' }}>
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1.5">
      <path
        d="M26 24h14v21.5l19.5-21.5h17L54.5 49.5 78.5 76H60.5L40 53.5V76H26V24z"
        fill="#ffffff"
      />
      <circle cx="76" cy="27" r="5.5" fill="#f58220" />
    </svg>
  </div>
);

export const EsewaLogo = ({ className = "w-9 h-9" }) => (
  <div className={`relative flex items-center justify-center rounded-xl overflow-hidden shadow-sm flex-shrink-0 ${className}`} style={{ backgroundColor: '#60bb46' }}>
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1.5">
      {/* Crisp eSewa stylized 'e' and leaf */}
      <path
        d="M70 49c0-12.5-9.5-21-22-21-13.5 0-23 9.5-23 23s9.5 23 24 23c9.5 0 17-5 20-13H58.5c-2.2 4-6 6-9.5 6-7.5 0-13.5-5.5-13.8-13.5H70c0-1.5 0-3 0-4.5zm-34.5-4c1-6.5 6-11 12.5-11s11.5 4.5 12.5 11H35.5z"
        fill="#ffffff"
      />
      <circle cx="73" cy="29" r="5" fill="#ffffff" opacity="0.9" />
    </svg>
  </div>
);

export const PaymentMethodBadge = ({ method }) => {
  if (method === 'khalti') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#ede9fe', color: '#5c2d91' }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5c2d91' }} />
        Khalti
      </span>
    );
  }
  if (method === 'esewa') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#15803d' }} />
        eSewa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
      Online
    </span>
  );
};
