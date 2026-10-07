import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCourts } from '../../services/courtService';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CourtCard = ({ court }) => (
  <Link
    to={`/courts/${court._id}`}
    className="card hover:shadow-card transition-all duration-200 hover:-translate-y-1 overflow-hidden group flex flex-col"
  >
    <div className="aspect-[16/10] bg-gray-50 overflow-hidden relative">
      {court.images?.[0] ? (
        <img
          src={court.images[0].url} alt={court.courtName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
          <span className="text-4xl">🏟️</span>
        </div>
      )}
      <div className="absolute top-2.5 right-2.5">
        <span className="bg-white/95 backdrop-blur-sm shadow-sm text-xs font-semibold px-2.5 py-1 rounded-full text-brand-navy">
          {court.courtType} Side
        </span>
      </div>
    </div>
    <div className="p-5 flex-1 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-ink-deep text-lg group-hover:text-primary transition-colors">{court.courtName}</h3>
        </div>
        <p className="text-sm text-slate mb-3">📍 {court.location}</p>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-hairline">
        <div>
          <span className="text-lg font-bold text-ink-deep">{formatCurrency(court.price)}</span>
          <span className="text-xs text-slate">/hr</span>
        </div>
        <span className="text-xs text-steel font-medium">{court.operatingHours?.open} – {court.operatingHours?.close}</span>
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
      {/* Page header with refined spacing */}
      <div className="hero-band py-10 sm:py-14 relative overflow-hidden">
        <div className="container-page text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-3">
            <span className="text-xs font-medium text-white/80 tracking-wide uppercase">Discover Courts</span>
          </div>
          <h1 className="text-white font-bold mb-2 text-3xl sm:text-4xl lg:text-5xl" style={{ letterSpacing: '-1px' }}>
            Find a court near you
          </h1>
          <p className="text-white/70 text-sm sm:text-base max-w-lg mx-auto">
            Book futsal courts in Dharan with instant confirmation
          </p>
        </div>
      </div>

      <div className="container-page py-6 sm:py-8">
        {/* Search + filter bar */}
        <div className="card p-3 sm:p-4 mb-6 sm:mb-8 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate text-sm">🔍</span>
              <input
                className="input pl-9"
                placeholder="Search by arena name or location..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select
              className="input sm:w-44"
              value={filters.courtType}
              onChange={(e) => {
                const f = { ...filters, courtType: e.target.value, page: 1 };
                setFilters(f);
                fetchCourts(f);
              }}
            >
              <option value="">All court types</option>
              <option value="5A">5A Side</option>
              <option value="7A">7A Side</option>
            </select>
            <button type="submit" className="btn-primary px-6 py-2.5">Search</button>
          </form>
        </div>

        {loading ? <PageSpinner /> : courts.length === 0 ? (
          <div className="text-center py-16 card bg-gray-50 p-6">
            <p className="text-4xl mb-3">🏟️</p>
            <p className="text-lg font-semibold text-ink-deep mb-1">No courts found</p>
            <p className="text-slate text-sm">Try different search terms or select "All court types"</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-medium text-slate">
                Showing <span className="font-semibold text-ink-deep">{courts.length}</span> of <span className="font-semibold text-ink-deep">{pagination?.total || courts.length}</span> venues
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {courts.map((c) => <CourtCard key={c._id} court={c} />)}
            </div>

            {pagination?.pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="btn-secondary disabled:opacity-40 text-xs sm:text-sm"
                >
                  ← Previous
                </button>
                <span className="text-xs sm:text-sm text-slate">Page {filters.page} of {pagination.pages}</span>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page === pagination.pages}
                  className="btn-secondary disabled:opacity-40 text-xs sm:text-sm"
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
