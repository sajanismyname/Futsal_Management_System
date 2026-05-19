import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTournaments } from '../../services/tournamentService';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const tintCycle = ['bg-tint-lavender', 'bg-tint-sky', 'bg-tint-mint', 'bg-tint-peach', 'bg-tint-yellow', 'bg-tint-rose'];

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'registration_open', label: 'Open' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

const TournamentsPage = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('');

  const load = (status) => {
    setLoading(true);
    const params = status ? { status } : {};
    getTournaments(params)
      .then((r) => setTournaments(r.data.tournaments))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(activeStatus); }, [activeStatus]);

  const canCreate = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-brand-navy py-14">
        <div className="container-page flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-on-dark font-semibold mb-2" style={{ fontSize: 'clamp(28px,5vw,48px)', letterSpacing: '-0.5px' }}>
              Tournaments
            </h1>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>Compete, play, and climb the standings</p>
          </div>
          {canCreate && (
            <Link to="/tournaments/new" className="btn-primary flex-shrink-0">+ Create tournament</Link>
          )}
        </div>
      </div>

      <div className="container-page py-8">
        {/* Status filter tabs */}
        <div className="flex gap-1 flex-wrap mb-7 border-b border-hairline">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setActiveStatus(value)}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                activeStatus === value ? 'border-ink-deep text-ink-deep' : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? <PageSpinner /> : tournaments.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-4xl mb-4">🏆</p>
            <p className="text-base font-medium text-ink-deep">No tournaments found</p>
            <p className="text-sm text-slate mt-2">
              {canCreate ? 'Create the first tournament.' : 'Check back soon for upcoming events.'}
            </p>
            {canCreate && (
              <Link to="/tournaments/new" className="btn-primary mt-4 inline-flex">+ Create tournament</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tournaments.map((t, i) => (
              <Link
                key={t._id}
                to={`/tournaments/${t._id}`}
                className={`rounded-xl p-6 hover:shadow-card transition-all duration-200 hover:-translate-y-0.5 block ${tintCycle[i % tintCycle.length]}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge status={t.status} label={t.status.replace(/_/g, ' ')} />
                  <span className="text-xs text-charcoal font-medium capitalize">{t.format?.replace('_', ' ')}</span>
                </div>
                <h3 className="text-lg font-semibold text-ink-deep mb-2">{t.tournamentName || t.name}</h3>
                {t.description && <p className="text-sm text-charcoal mb-4 line-clamp-2">{t.description}</p>}
                <div className="space-y-1.5 text-xs text-charcoal mt-auto">
                  <p>📅 {formatDate(t.startDate)} – {formatDate(t.endDate)}</p>
                  <p>👥 {t.registeredTeams?.length || 0} / {t.maxTeams} teams</p>
                  {t.entryFee > 0 && <p>💰 {formatCurrency(t.entryFee)} entry fee</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentsPage;
