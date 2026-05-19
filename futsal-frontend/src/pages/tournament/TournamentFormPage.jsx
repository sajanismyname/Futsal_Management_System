import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTournament } from '../../services/tournamentService';
import { getMyCourts } from '../../services/courtService';
import Spinner from '../../components/ui/Spinner';
import { getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TournamentFormPage = () => {
  const navigate = useNavigate();
  const [courts, setCourts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tournamentName: '', courtId: '', description: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'),
    registrationDeadline: '', maxTeams: 8, entryFee: 0, prizePool: '', format: 'round_robin',
  });

  useEffect(() => {
    getMyCourts().then((r) => setCourts(r.data.courts.filter((c) => c.isApproved))).catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await createTournament(form);
      toast.success('Tournament created!');
      navigate(`/tournaments/${r.data.tournament._id}`);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container-page py-10 max-w-2xl">
        <div className="mb-7">
          <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>Create tournament</h1>
          <p className="text-sm text-slate mt-1">Set up a new futsal tournament</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-ink-deep">Tournament details</h2>
            <div className="input-group">
              <label className="input-label">Tournament name *</label>
              <input type="text" name="tournamentName" value={form.tournamentName} onChange={handleChange} className="input" required />
            </div>
            <div className="input-group">
              <label className="input-label">Venue court</label>
              <select name="courtId" value={form.courtId} onChange={handleChange} className="input">
                <option value="">Select a court (optional)</option>
                {courts.map((c) => <option key={c._id} value={c._id}>{c.courtName} — {c.location}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="input h-24 resize-none" />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-ink-deep mb-4">Schedule & structure</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="input-group">
                <label className="input-label">Start date *</label>
                <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="input" required min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              <div className="input-group">
                <label className="input-label">End date *</label>
                <input type="date" name="endDate" value={form.endDate} onChange={handleChange} className="input" required />
              </div>
              <div className="input-group">
                <label className="input-label">Registration deadline</label>
                <input type="date" name="registrationDeadline" value={form.registrationDeadline} onChange={handleChange} className="input" />
              </div>
              <div className="input-group">
                <label className="input-label">Max teams *</label>
                <select name="maxTeams" value={form.maxTeams} onChange={handleChange} className="input">
                  {[4, 6, 8, 10, 12, 16, 20, 24, 32].map((n) => <option key={n} value={n}>{n} teams</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Entry fee (NPR)</label>
                <input type="number" name="entryFee" value={form.entryFee} onChange={handleChange} className="input" min="0" />
              </div>
              <div className="input-group">
                <label className="input-label">Prize pool</label>
                <input type="text" name="prizePool" value={form.prizePool} onChange={handleChange} className="input" placeholder="e.g. NPR 50,000" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-ink-deep mb-4">Format</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'round_robin', label: 'Round Robin', desc: 'Every team plays each other', icon: '🔄' },
                { value: 'knockout', label: 'Knockout', desc: 'Single elimination', icon: '⚡' },
              ].map(({ value, label, desc, icon }) => (
                <label
                  key={value}
                  className={`flex flex-col gap-1.5 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    form.format === value ? 'border-primary bg-primary-light' : 'border-hairline hover:border-hairline-strong'
                  }`}
                >
                  <input type="radio" name="format" value={value} checked={form.format === value} onChange={handleChange} className="sr-only" />
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-semibold text-ink-deep">{label}</span>
                  <span className="text-xs text-slate">{desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner size="sm" /> : 'Create tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TournamentFormPage;
