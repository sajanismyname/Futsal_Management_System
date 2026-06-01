import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

  const toggleSlot = (slot) => {
    if (slot.isBooked) return;
    setSelectedSlots((prev) => prev.find((s) => s.start === slot.start) ? prev.filter((s) => s.start !== slot.start) : [...prev, slot]);
  };

  const getBookingTimes = () => {
    if (!selectedSlots.length) return null;
    const sorted = [...selectedSlots].sort((a, b) => a.start.localeCompare(b.start));
    return { startTime: sorted[0].start, endTime: sorted[sorted.length - 1].end };
  };

  const totalAmount = selectedSlots.length * (court?.price || 0);

  const handleBook = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    const times = getBookingTimes();
    if (!times) return;
    setBooking(true);
    try {
      const res = await createBooking({ courtId: id, bookingDate: selectedDate, ...times });
      toast.success('Booking created!');
      navigate(`/payment/${res.data.booking._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setBooking(false); setShowModal(false); }
  };

  if (loadingCourt) return <PageSpinner />;
  if (!court) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate">Court not found</p></div>;

  const times = getBookingTimes();

  return (
    <div className="bg-white min-h-screen">
      {/* Hero image */}
      {court.images?.length > 0 && (
        <div className="w-full bg-gray-50" style={{ height: '45vh', maxHeight: 500 }}>
          <img src={court.images[currentImage].url} alt={court.courtName} className="w-full h-full object-cover" />
          {court.images.length > 1 && (
            <div className="flex gap-2 justify-center py-3">
              {court.images.map((_, i) => (
                <button key={i} onClick={() => setCurrentImage(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === currentImage ? 'bg-ink-deep' : 'bg-hairline-strong'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="container-page py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge status="confirmed" label={court.courtType + ' Side'} />
                <span className="text-sm text-slate">📍 {court.location}</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink-deep mb-2" style={{ letterSpacing: '-0.5px' }}>
                {court.courtName}
              </h1>
              {court.description && <p className="text-base text-slate leading-relaxed">{court.description}</p>}
            </div>

            {/* Specs grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Court type', value: court.courtType + ' Side' },
                { label: 'Price / hour', value: formatCurrency(court.price) },
                { label: 'Opens', value: court.operatingHours.open },
                { label: 'Closes', value: court.operatingHours.close },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-steel mb-1">{label}</p>
                  <p className="text-base font-semibold text-ink-deep">{value}</p>
                </div>
              ))}
            </div>

            {court.amenities?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-ink-deep mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {court.amenities.map((a) => (
                    <span key={a} className="text-sm bg-gray-50 border border-hairline rounded-md px-3 py-1.5 text-ink">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — booking panel */}
          {(user?.role === 'customer' || !isAuthenticated) && (
            <div className="lg:sticky lg:top-24 self-start">
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
    </div>
  );
};

export default CourtDetailPage;
