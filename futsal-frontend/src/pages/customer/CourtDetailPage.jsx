import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCourt } from '../../services/courtService';
import { getAvailableSlots, createBooking } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import { PageSpinner } from '../../components/ui/Spinner';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatTime, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { connectSocket, timesOverlap } from '../../services/socket';

const CourtDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [court, setCourt] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [loadingCourt, setLoadingCourt] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [booking, setBooking] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    getCourt(id).then((r) => setCourt(r.data.court)).catch(() => toast.error('Court not found')).finally(() => setLoadingCourt(false));
  }, [id]);

  useEffect(() => {
    if (!court) return;
    setLoadingSlots(true);
    getAvailableSlots(id, selectedDate).then((r) => { setSlots(r.data.slots); setSelectedSlots([]); }).catch(() => toast.error('Failed to load slots')).finally(() => setLoadingSlots(false));
  }, [id, selectedDate, court]);

  useEffect(() => {
    if (!court || !selectedDate) return;

    const socket = connectSocket();
    socket.emit('court:join', { courtId: id, date: selectedDate });

    const handleSlotUpdate = (payload) => {
      if (payload.courtId !== id || payload.date !== selectedDate) return;

      setSlots((prev) =>
        prev.map((slot) =>
          timesOverlap(slot.start, slot.end, payload.startTime, payload.endTime)
            ? { ...slot, isBooked: payload.isBooked }
            : slot
        )
      );

      if (payload.isBooked) {
        setSelectedSlots((prev) =>
          prev.filter((slot) => !timesOverlap(slot.start, slot.end, payload.startTime, payload.endTime))
        );
      }
    };

    socket.on('slot:updated', handleSlotUpdate);

    return () => {
      socket.emit('court:leave', { courtId: id, date: selectedDate });
      socket.off('slot:updated', handleSlotUpdate);
    };
  }, [id, selectedDate, court]);

  const areSlotsContiguous = (slots) => {
    if (slots.length <= 1) return true;
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].end !== sorted[i + 1].start) {
        return false;
      }
    }
    return true;
  };

  const toggleSlot = (slot) => {
    if (slot.isBooked) return;
    setSelectedSlots((prev) => {
      const isSelected = prev.some((s) => s.start === slot.start);
      if (isSelected) {
        const next = prev.filter((s) => s.start !== slot.start);
        if (areSlotsContiguous(next)) {
          return next;
        }
        toast.error('Deselecting this slot creates a gap in your reservation');
        return prev;
      } else {
        if (prev.length === 0) return [slot];
        const next = [...prev, slot];
        if (areSlotsContiguous(next)) {
          return next;
        }
        toast.error('Booking slots must be continuous without gaps');
        return [slot];
      }
    });
  };

  const getBookingTimes = () => {
    if (!selectedSlots.length) return null;
    const sorted = [...selectedSlots].sort((a, b) => a.start.localeCompare(b.start));
    return { startTime: sorted[0].start, endTime: sorted[sorted.length - 1].end };
  };

  const totalAmount = selectedSlots.length * (court?.price || 0);

  const handleBook = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!areSlotsContiguous(selectedSlots)) {
      toast.error('Selected slots must be continuous');
      return;
    }
    const times = getBookingTimes();
    if (!times) return;
    setBooking(true);
    try {
      const res = await createBooking({ courtId: id, bookingDate: selectedDate, ...times });
      toast.success('Booking created!');
      navigate(`/payment/${res.data.booking._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      if (err.response?.status === 409) {
        getAvailableSlots(id, selectedDate)
          .then((r) => setSlots(r.data.slots))
          .catch(() => {});
        setSelectedSlots([]);
      }
    } finally { setBooking(false); setShowModal(false); }
  };

  if (loadingCourt) return <PageSpinner />;
  if (!court) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate">Court not found</p></div>;

  const times = getBookingTimes();

  return (
    <div className="bg-white min-h-screen">
      {/* ── UPPER PART: BREADCRUMBS, TITLE & META ─────── */}
      <div className="container-page pt-4 sm:pt-6 pb-2">
        {/* Breadcrumb / Back button & Share action */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate">
            <Link to="/courts" className="inline-flex items-center gap-1.5 hover:text-ink font-medium transition-colors">
              <span>←</span> Courts
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-steel hidden sm:inline">{court.location}</span>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <span className="text-ink font-semibold truncate max-w-[200px] sm:max-w-none">{court.courtName}</span>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: court.courtName, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(window.location.href);
                  toast.success('Link copied to clipboard!');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hairline bg-gray-50 hover:bg-gray-100 text-xs font-medium text-slate hover:text-ink transition-colors"
              title="Share Court"
            >
              <span>🔗</span>
              <span className="hidden sm:inline">Share</span>
            </button>
            <span className="text-[11px] sm:text-xs text-steel px-2 py-1 rounded bg-gray-100 border border-hairline font-mono">
              #{court._id.slice(-6)}
            </span>
          </div>
        </div>

        {/* Court Main Title & Header Info */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 pb-1">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge status="confirmed" label={`${court.courtType} Side`} />
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                ★ 4.9 Verified Arena
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Available for Booking
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-ink-deep tracking-tight">
              {court.courtName}
            </h1>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 sm:gap-x-4 text-xs sm:text-sm text-slate">
              <span className="inline-flex items-center gap-1 font-medium text-ink">
                📍 {court.location}
              </span>
              <span className="text-gray-300">•</span>
              <span className="inline-flex items-center gap-1">
                🕒 Hours: <span className="text-ink font-medium">{court.operatingHours.open} - {court.operatingHours.close}</span>
              </span>
              <span className="text-gray-300">•</span>
              <span className="inline-flex items-center gap-1 text-purple-700 font-medium">
                ⚡ Khalti & eSewa accepted
              </span>
            </div>
          </div>

          {/* Quick Price and Jump to booking */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-end bg-purple-50/60 md:bg-transparent p-3 md:p-0 rounded-xl border border-purple-100 md:border-0 w-full md:w-auto justify-between md:justify-end">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-ink-deep">{formatCurrency(court.price)}</span>
                <span className="text-xs text-slate">/ hr</span>
              </div>
              <p className="text-[11px] text-steel hidden md:block">Instant online confirmation</p>
            </div>
            <a
              href="#booking-panel"
              onClick={(e) => {
                e.preventDefault();
                const panel = document.getElementById('booking-panel');
                if (panel) panel.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn btn-primary btn-sm sm:btn-md shadow-sm"
            >
              Book Slots ↓
            </a>
          </div>
        </div>

        {/* ── PHOTO GRID / GALLERY ──────────────────────── */}
        {court.images && court.images.length > 0 ? (
          <div>
            {/* Desktop / Tablet Mosaic Grid */}
            <div className="hidden sm:block">
              {court.images.length === 1 && (
                <div
                  onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                  className="w-full h-[360px] md:h-[440px] rounded-2xl overflow-hidden cursor-pointer group relative shadow-sm border border-hairline"
                >
                  <img
                    src={court.images[0].url}
                    alt={court.courtName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/95 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full text-ink shadow-md">
                      🔍 View full size
                    </span>
                  </div>
                </div>
              )}

              {court.images.length === 2 && (
                <div className="grid grid-cols-2 gap-3 h-[340px] md:h-[420px] rounded-2xl overflow-hidden shadow-sm border border-hairline">
                  {court.images.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                      className="h-full overflow-hidden cursor-pointer group relative"
                    >
                      <img
                        src={img.url}
                        alt={`${court.courtName} - ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/95 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full text-ink shadow-md">
                          🔍 View photo
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {court.images.length === 3 && (
                <div className="grid grid-cols-3 gap-3 h-[360px] md:h-[440px] rounded-2xl overflow-hidden shadow-sm border border-hairline">
                  <div
                    onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                    className="col-span-2 h-full overflow-hidden cursor-pointer group relative"
                  >
                    <img
                      src={court.images[0].url}
                      alt={`${court.courtName} - 1`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white/95 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full text-ink shadow-md">
                        🔍 View photo
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1 flex flex-col gap-3 h-full">
                    {[1, 2].map((idx) => (
                      <div
                        key={idx}
                        onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                        className="h-1/2 overflow-hidden cursor-pointer group relative"
                      >
                        <img
                          src={court.images[idx].url}
                          alt={`${court.courtName} - ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-white/95 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded-full text-ink shadow-md">
                            🔍
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {court.images.length === 4 && (
                <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[360px] md:h-[440px] rounded-2xl overflow-hidden shadow-sm border border-hairline">
                  <div
                    onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                    className="col-span-2 row-span-2 h-full overflow-hidden cursor-pointer group relative"
                  >
                    <img
                      src={court.images[0].url}
                      alt={`${court.courtName} - 1`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white/95 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full text-ink shadow-md">
                        🔍 View photo
                      </span>
                    </div>
                  </div>
                  {court.images.slice(1, 4).map((img, idx) => (
                    <div
                      key={idx + 1}
                      onClick={() => { setLightboxIndex(idx + 1); setLightboxOpen(true); }}
                      className={`${idx === 0 ? 'col-span-2 row-span-1' : 'col-span-1 row-span-1'} overflow-hidden cursor-pointer group relative`}
                    >
                      <img
                        src={img.url}
                        alt={`${court.courtName} - ${idx + 2}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {court.images.length >= 5 && (
                <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[380px] md:h-[460px] rounded-2xl overflow-hidden shadow-sm border border-hairline">
                  {/* Main featured photo */}
                  <div
                    onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                    className="col-span-2 row-span-2 h-full overflow-hidden cursor-pointer group relative"
                  >
                    <img
                      src={court.images[0].url}
                      alt={`${court.courtName} - 1`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white/95 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full text-ink shadow-md">
                        🔍 View photo
                      </span>
                    </div>
                  </div>
                  {/* Secondary 4 photos */}
                  {court.images.slice(1, 5).map((img, idx) => {
                    const isLast = idx === 3 && court.images.length > 5;
                    return (
                      <div
                        key={idx + 1}
                        onClick={() => { setLightboxIndex(idx + 1); setLightboxOpen(true); }}
                        className="col-span-1 row-span-1 h-full overflow-hidden cursor-pointer group relative"
                      >
                        <img
                          src={img.url}
                          alt={`${court.courtName} - ${idx + 2}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {isLast && (
                          <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-semibold text-xs sm:text-sm backdrop-blur-[2px]">
                            +{court.images.length - 4} photos
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mobile Carousel & Thumbnails */}
            <div className="sm:hidden">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden shadow-sm bg-gray-100 border border-hairline">
                <img
                  src={court.images[currentImage]?.url || court.images[0].url}
                  alt={court.courtName}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => { setLightboxIndex(currentImage); setLightboxOpen(true); }}
                />
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                  {currentImage + 1} / {court.images.length}
                </div>
                {court.images.length > 1 && (
                  <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none">
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImage((prev) => (prev > 0 ? prev - 1 : court.images.length - 1)); }}
                      className="pointer-events-auto w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center text-ink text-sm font-bold"
                      aria-label="Previous image"
                    >
                      ‹
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImage((prev) => (prev < court.images.length - 1 ? prev + 1 : 0)); }}
                      className="pointer-events-auto w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center text-ink text-sm font-bold"
                      aria-label="Next image"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
              {/* Mobile thumbnails strip */}
              {court.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto py-2.5 px-0.5">
                  {court.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`w-14 h-11 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        i === currentImage ? 'border-primary shadow-sm' : 'border-transparent opacity-65'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-48 sm:h-64 rounded-2xl overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 flex flex-col items-center justify-center text-white p-6 shadow-sm">
            <span className="text-4xl sm:text-5xl mb-2">🏟️</span>
            <p className="font-semibold text-base sm:text-lg">{court.courtName}</p>
            <p className="text-xs text-white/70 mt-1">📍 {court.location} • Verified Futsal Arena</p>
          </div>
        )}
      </div>

      <div className="container-page py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details, Specs, Amenities */}
          <div className="lg:col-span-2 space-y-7">
            {/* About this arena */}
            <div className="bg-gray-50/80 border border-hairline rounded-2xl p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-ink-deep">About this arena</h2>
                  <p className="text-xs text-slate">Premier futsal ground located in {court.location}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                  ⚽
                </div>
              </div>
              <p className="text-sm sm:text-base text-slate leading-relaxed">
                {court.description || 'Modern futsal facility with premium synthetic turf, bright floodlighting for evening and night matches, changing rooms, and spectator seating.'}
              </p>
            </div>

            {/* Specs grid */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-steel mb-3">Arena Specifications</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'Court Type', value: `${court.courtType} Side`, icon: '📐' },
                  { label: 'Hourly Rate', value: formatCurrency(court.price), icon: '🏷️' },
                  { label: 'Opens At', value: court.operatingHours.open, icon: '🌅' },
                  { label: 'Closes At', value: court.operatingHours.close, icon: '🌙' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-white rounded-xl p-4 border border-hairline shadow-sm hover:border-purple-200 transition-colors">
                    <span className="text-xl mb-1.5 block">{icon}</span>
                    <p className="text-xs text-steel mb-0.5">{label}</p>
                    <p className="text-sm sm:text-base font-bold text-ink-deep">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {court.amenities?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-steel mb-3">Available Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {court.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-hairline shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-sm font-medium text-ink">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ground Guidelines */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 sm:p-5 text-xs text-blue-900 space-y-2">
              <p className="font-semibold text-sm text-blue-950 flex items-center gap-2">
                <span>📋</span> Match & Arena Guidelines
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                <p>• Arrive 10-15 minutes prior to kickoff.</p>
                <p>• Clean futsal shoes or turf trainers required.</p>
                <p>• Secure changing room and shower facility on-site.</p>
                <p>• Free parking for 2-wheelers and 4-wheelers.</p>
              </div>
            </div>
          </div>

          {/* Right — booking panel */}
          {(user?.role === 'customer' || !isAuthenticated) && (
            <div id="booking-panel" className="lg:sticky lg:top-24 self-start">
              <div className="card p-6 shadow-card">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <span className="text-2xl font-semibold text-ink-deep">{formatCurrency(court.price)}</span>
                    <span className="text-sm text-slate">/hr</span>
                  </div>
                  <Badge status="confirmed" label="Available" />
                </div>

                <div className="input-group mb-5">
                  <label className="input-label">Select date</label>
                  <input type="date" className="input" value={selectedDate} min={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>

                <div className="mb-5">
                  <label className="input-label mb-3">Time slots</label>
                  {loadingSlots ? (
                    <div className="flex justify-center py-4"><Spinner /></div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-slate py-2">No slots available</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      {slots.map((slot) => (
                        <button
                          key={slot.start}
                          onClick={() => toggleSlot(slot)}
                          disabled={slot.isBooked}
                          className={`py-2 text-xs font-medium rounded-md border transition-all ${
                            slot.isBooked
                              ? 'bg-gray-50 text-steel border-hairline cursor-not-allowed line-through'
                              : selectedSlots.find((s) => s.start === slot.start)
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-white text-ink border-hairline hover:border-primary hover:text-primary'
                          }`}
                        >
                          {formatTime(slot.start)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedSlots.length > 0 && (
                  <div className="flex items-center justify-between py-3 border-t border-hairline mb-4">
                    <span className="text-sm text-slate">{selectedSlots.length} hour(s)</span>
                    <span className="text-base font-semibold text-ink-deep">{formatCurrency(totalAmount)}</span>
                  </div>
                )}

                <button
                  onClick={() => { if (!isAuthenticated) { navigate('/login'); return; } setShowModal(true); }}
                  disabled={selectedSlots.length === 0}
                  className="btn-primary w-full py-3 disabled:opacity-40"
                >
                  {isAuthenticated ? 'Book now' : 'Log in to book'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Confirm your booking">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg divide-y divide-hairline-soft">
            {[
              ['Court', court.courtName],
              ['Date', selectedDate],
              ['Time', times ? `${formatTime(times.startTime)} – ${formatTime(times.endTime)}` : '—'],
              ['Duration', `${selectedSlots.length} hour(s)`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-slate">{l}</span>
                <span className="text-sm font-medium text-ink-deep">{v}</span>
              </div>
            ))}
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-sm font-semibold text-ink-deep">Total</span>
              <span className="text-lg font-semibold text-ink-deep">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          <p className="text-xs text-slate">Payment required to confirm. Booking holds for 30 minutes.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleBook} disabled={booking} className="btn-primary flex-1">
              {booking ? <Spinner size="sm" /> : 'Confirm & pay'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── FULLSCREEN PHOTO LIGHTBOX MODAL ───────────── */}
      {lightboxOpen && court.images && court.images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 select-none"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-xl transition-colors z-10"
            aria-label="Close viewer"
          >
            ✕
          </button>

          {/* Previous button */}
          {court.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev > 0 ? prev - 1 : court.images.length - 1));
              }}
              className="absolute left-4 sm:left-6 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-2xl transition-colors z-10"
              aria-label="Previous"
            >
              ‹
            </button>
          )}

          {/* Image & Caption */}
          <div
            className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={court.images[lightboxIndex]?.url}
              alt={`${court.courtName} - ${lightboxIndex + 1}`}
              className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <div className="mt-3 text-center text-white/80 text-sm">
              <span className="font-semibold text-white">{court.courtName}</span>
              <span className="mx-2">•</span>
              <span>Photo {lightboxIndex + 1} of {court.images.length}</span>
            </div>
          </div>

          {/* Next button */}
          {court.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev < court.images.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-4 sm:right-6 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-2xl transition-colors z-10"
              aria-label="Next"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CourtDetailPage;
