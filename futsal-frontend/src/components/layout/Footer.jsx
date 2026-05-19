import { Link } from 'react-router-dom';

const cols = [
  {
    heading: 'Platform',
    links: [
      { to: '/courts', label: 'Find Courts' },
      { to: '/tournaments', label: 'Tournaments' },
      { to: '/register', label: 'Get started free' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { to: '/login', label: 'Log in' },
      { to: '/register', label: 'Create account' },
      { to: '/profile', label: 'Profile' },
    ],
  },
  {
    heading: 'For Owners',
    links: [
      { to: '/owner/dashboard', label: 'Dashboard' },
      { to: '/owner/courts', label: 'My Courts' },
      { to: '/owner/courts/new', label: 'List a court' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { to: 'mailto:support@futsalmgmt.com', label: 'Contact us', external: true },
    ],
  },
];

const Footer = () => (
  <footer className="bg-white border-t border-hairline">
    <div className="container-page py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        {cols.map(({ heading, links }) => (
          <div key={heading}>
            <p className="text-sm font-semibold text-ink mb-4">{heading}</p>
            <ul className="space-y-2.5">
              {links.map(({ to, label, external }) => (
                <li key={label}>
                  {external ? (
                    <a href={to} className="text-sm text-steel hover:text-ink transition-colors">{label}</a>
                  ) : (
                    <Link to={to} className="text-sm text-steel hover:text-ink transition-colors">{label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-hairline pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="font-bold text-ink-deep text-sm" style={{ letterSpacing: '-0.2px' }}>
            Futsal<span className="text-primary font-semibold">Mgmt</span>
          </span>
        </Link>
        <p className="text-sm text-steel">© {new Date().getFullYear()} Futsal Management System. Built for Nepal.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
