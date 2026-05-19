import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCourts } from '../../services/courtService';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CourtCard = ({ court }) => (
  <Link
    to={`/courts/${court._id}`}
    className="card hover:shadow-card transition-all duration-200 hover:-translate-y-0.5 overflow-hidden group"
  >
    <div className="aspect-[16/9] bg-gray-50 overflow-hidden">
      {court.images?.[0] ? (
        <img
          src={court.images[0].url} alt={court.courtName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-4xl">🏟️</span>
        </div>
      )}
    </div>
    <div className="p-5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-ink-deep text-base">{court.courtName}</h3>
        <Badge status="confirmed" label={court.courtType + 'v' + court.courtType} />
      </div>
      <p className="text-sm text-slate mb-3">📍 {court.location}</p>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-semibold text-ink-deep">{formatCurrency(court.price)}</span>
          <span className="text-sm text-slate">/hr</span>
        </div>
        <span className="text-xs text-steel">{court.operatingHours?.open} – {court.operatingHours?.close}</span>
      </div>
    </div>
  </Link>
);

const CourtsPage = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({ search: '', courtType: '', page: 1 });

  const fetchCourts = async (f = filters) => {
    setLoading(true);
    try {
      const params = { ...f };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await getCourts(params);
      setCourts(res.data.courts);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load courts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCourts(); }, [filters.page]);

  const handleSearch = (e) => {
    e.preventDefault();
    const f = { ...filters, page: 1 };
    setFilters(f);
    fetchCourts(f);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Page header */}
      <div className="bg-brand-navy py-14">
        <div className="container-page text-center">
          <h1 className="text-on-dark font-semibold mb-3" style={{ fontSize: 'clamp(32px,5vw,56px)', letterSpacing: '-1px' }}>
            Find a court
          </h1>
          <p className="text-on-dark-muted text-lg">Discover and book futsal courts near you</p>
        </div>
      </div>

      <div className="container-page py-8">
        {/* Search + filter bar */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            className="input flex-1"
            placeholder="Search by name or location..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="input sm:w-44"
            value={filters.courtType}
            onChange={(e) => setFilters({ ...filters, courtType: e.target.value })}
          >
            <option value="">All types</option>
            <option value="5A">5A Side</option>
            <option value="7A">7A Side</option>
          </select>
          <button type="submit" className="btn-primary px-6">Search</button>
        </form>

        {loading ? <PageSpinner /> : courts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🏟️</p>
            <p className="text-lg font-medium text-ink-deep mb-2">No courts found</p>
            <p className="text-slate text-sm">Try different search terms or filters</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate mb-6">{pagination?.total || courts.length} courts available</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {courts.map((c) => <CourtCard key={c._id} court={c} />)}
            </div>

            {pagination?.pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="btn-secondary disabled:opacity-40"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate">Page {filters.page} of {pagination.pages}</span>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page === pagination.pages}
                  className="btn-secondary disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CourtsPage;
