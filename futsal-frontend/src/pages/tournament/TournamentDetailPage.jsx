import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  getTournament, registerTeam, generateFixtures, updateScore,
  getMyTeams, createTeam, updateTournament,
} from '../../services/tournamentService';
import { useAuth } from '../../context/AuthContext';
import { PageSpinner } from '../../components/ui/Spinner';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { formatDate, formatCurrency, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { connectSocket } from '../../services/socket';

const TournamentDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [registering, setRegistering] = useState(false);

  const [teamModal, setTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState({ teamName: '', description: '' });
  const [creatingTeam, setCreatingTeam] = useState(false);

  const [generating, setGenerating] = useState(false);

  const [scoreModal, setScoreModal] = useState({ open: false, idx: null, scoreA: '', scoreB: '' });
  const [savingScore, setSavingScore] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { const r = await getTournament(id); setData(r.data); }
    catch { toast.error('Failed to load tournament'); }
    finally { setLoading(false); }
  };

  const fetchMyTeams = () => {
    if (user?.role === 'customer') {
      getMyTeams().then((r) => setMyTeams(r.data.teams)).catch(() => {});
    }
  };

  useEffect(() => { fetchData(); }, [id]);
  useEffect(() => { fetchMyTeams(); }, [user]);

  useEffect(() => {
    const socket = connectSocket();
    socket.emit('tournament:join', { tournamentId: id });

    const handleFixtureUpdate = (payload) => {
      if (payload.tournamentId !== id) return;

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tournament: { ...prev.tournament, fixtures: payload.fixtures },
          standings: payload.standings,
        };
      });
    };

    socket.on('fixture:updated', handleFixtureUpdate);

    return () => {
      socket.emit('tournament:leave', { tournamentId: id });
      socket.off('fixture:updated', handleFixtureUpdate);
    };
  }, [id]);

  const handleRegister = async () => {
    if (!selectedTeam) { toast.error('Select a team first'); return; }
    setRegistering(true);
    try { await registerTeam(id, selectedTeam); toast.success('Team registered!'); fetchData(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setRegistering(false); }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamForm.teamName.trim()) { toast.error('Team name is required'); return; }
    setCreatingTeam(true);
    try {
      const r = await createTeam(teamForm);
      toast.success('Team created!');
      setTeamModal(false);
      setTeamForm({ teamName: '', description: '' });
      const teamsRes = await getMyTeams();
      setMyTeams(teamsRes.data.teams);
      setSelectedTeam(r.data.team._id);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCreatingTeam(false); }
  };

  const handleGenerateFixtures = async () => {
    setGenerating(true);
    try { await generateFixtures(id); toast.success('Fixtures generated!'); fetchData(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setGenerating(false); }
  };

  const handleSaveScore = async () => {
    if (scoreModal.scoreA === '' || scoreModal.scoreB === '') { toast.error('Enter both scores'); return; }
    setSavingScore(true);
    try {
      await updateScore(id, { fixtureIndex: scoreModal.idx, scoreA: scoreModal.scoreA, scoreB: scoreModal.scoreB });
      toast.success('Score updated');
      setScoreModal({ open: false, idx: null, scoreA: '', scoreB: '' });
      fetchData();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingScore(false); }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await updateTournament(id, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      fetchData();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setUpdatingStatus(false); }
  };

  if (loading) return <PageSpinner />;
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate">Tournament not found</p>
    </div>
  );

  const { tournament, standings } = data;
  const isOwner = user?.role === 'admin' ||
    tournament.ownerId?._id === user?._id ||
    tournament.ownerId === user?._id;
  const canRegister = user?.role === 'customer' &&
    ['upcoming', 'registration_open'].includes(tournament.status);
  const tabs = ['overview', 'teams', 'fixtures', 'standings'];

  const statusTransitions = {
    upcoming: { label: 'Open Registration', next: 'registration_open' },
    registration_open: { label: 'Close Registration', next: 'upcoming' },
    ongoing: { label: 'Mark as Completed', next: 'completed' },
  };
  const nextTransition = statusTransitions[tournament.status];

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-brand-navy py-10">
        <div className="container-page">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge status={tournament.status} label={tournament.status.replace(/_/g, ' ')} />
            <span className="text-sm capitalize" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {tournament.format?.replace('_', ' ')}
            </span>
          </div>
          <h1 className="text-white font-semibold" style={{ fontSize: 'clamp(28px,5vw,48px)', letterSpacing: '-0.5px' }}>
            {tournament.tournamentName || tournament.name}
          </h1>
          {tournament.courtId && (
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              📍 {tournament.courtId.courtName} — {tournament.courtId.location}
            </p>
          )}
        </div>
      </div>

      <div className="container-page py-6">
        <div className="flex gap-6 border-b border-hairline mb-7 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab ? 'border-ink-deep text-ink-deep' : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              {tab}
              {tab === 'teams' && ` (${tournament.registeredTeams?.length || 0})`}
              {tab === 'fixtures' && tournament.fixtures?.length > 0 && ` (${tournament.fixtures.length})`}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Start date', value: formatDate(tournament.startDate), tint: 'bg-tint-sky' },
                { label: 'End date', value: formatDate(tournament.endDate), tint: 'bg-tint-peach' },
                { label: 'Teams', value: `${tournament.registeredTeams?.length || 0} / ${tournament.maxTeams}`, tint: 'bg-tint-lavender' },
                { label: 'Entry fee', value: tournament.entryFee > 0 ? formatCurrency(tournament.entryFee) : 'Free', tint: 'bg-tint-mint' },
              ].map(({ label, value, tint }) => (
                <div key={label} className={`rounded-xl p-4 ${tint}`}>
                  <p className="text-xs text-charcoal mb-1">{label}</p>
                  <p className="text-base font-semibold text-ink-deep">{value}</p>
                </div>
              ))}
            </div>

            {tournament.description && (
              <div className="card p-5">
                <p className="text-sm text-slate leading-relaxed">{tournament.description}</p>
              </div>
            )}

            {tournament.prizePool && (
              <div className="bg-tint-yellow rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-xs text-charcoal font-medium">Prize pool</p>
                  <p className="text-base font-semibold text-ink-deep">{tournament.prizePool}</p>
                </div>
              </div>
            )}

            {isOwner && (
              <div className="card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-ink-deep">Tournament controls</h3>
                <div className="flex flex-wrap gap-3">
                  {nextTransition && (
                    <button
                      onClick={() => handleStatusChange(nextTransition.next)}
                      disabled={updatingStatus}
                      className="btn-primary"
                    >
                      {updatingStatus ? <Spinner size="sm" /> : nextTransition.label}
                    </button>
                  )}
                  {tournament.fixtures.length === 0 && tournament.registeredTeams.length >= 2 && (
                    <button onClick={handleGenerateFixtures} disabled={generating} className="btn-dark">
                      {generating ? <Spinner size="sm" /> : `⚡ Generate fixtures (${tournament.registeredTeams.length} teams)`}
                    </button>
                  )}
                  {tournament.status === 'ongoing' && tournament.fixtures.every(f => f.status === 'completed') && (
                    <button onClick={() => handleStatusChange('completed')} disabled={updatingStatus} className="btn-secondary">
                      {updatingStatus ? <Spinner size="sm" /> : '✓ Mark completed'}
                    </button>
                  )}
                </div>
                {tournament.registeredTeams.length < 2 && tournament.fixtures.length === 0 && (
                  <p className="text-xs text-steel">Need at least 2 teams to generate fixtures.</p>
                )}
              </div>
            )}

            {canRegister && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-ink-deep mb-4">Register your team</h3>
                <div className="flex gap-3 flex-wrap">
                  <select
                    className="input flex-1 min-w-[160px]"
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                  >
                    <option value="">Select a team...</option>
                    {myTeams.map((t) => <option key={t._id} value={t._id}>{t.teamName}</option>)}
                  </select>
                  <button onClick={handleRegister} disabled={registering || !selectedTeam} className="btn-primary flex-shrink-0">
                    {registering ? <Spinner size="sm" /> : 'Register'}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <p className="text-xs text-steel">
                    {myTeams.length === 0 ? "You don't have a team yet." : `${myTeams.length} team(s) available.`}
                  </p>
                  <button
                    onClick={() => setTeamModal(true)}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    + Create new team
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="card overflow-hidden">
            {tournament.registeredTeams.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-3xl mb-3">👥</p>
                <p className="text-slate text-sm">No teams registered yet</p>
              </div>
            ) : (
              <div className="divide-y divide-hairline-soft">
                {tournament.registeredTeams.map((team, i) => (
                  <div key={team._id} className="flex items-center gap-4 px-5 py-4">
                    <span className="text-xs text-steel w-6 text-center font-medium">{i + 1}</span>
                    <div className="w-9 h-9 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-sm">{team.teamName?.[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-deep truncate">{team.teamName}</p>
                      <p className="text-xs text-steel">{team.members?.length || 0} member(s)</p>
                    </div>
                    {i === 0 && <span className="text-xs bg-tint-yellow text-brand-brown font-semibold px-2 py-0.5 rounded-full">Captain</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'fixtures' && (
          <div className="card overflow-hidden">
            {tournament.fixtures.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-3xl mb-3">📋</p>
                <p className="text-slate text-sm">No fixtures generated yet</p>
                {isOwner && tournament.registeredTeams.length >= 2 && (
                  <button onClick={handleGenerateFixtures} disabled={generating} className="btn-primary mt-4">
                    {generating ? <Spinner size="sm" /> : 'Generate fixtures'}
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-hairline-soft">
                {tournament.fixtures.map((fixture, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-4">
                    <span className="text-xs bg-gray-100 rounded-md px-2 py-1 text-slate flex-shrink-0 font-medium">
                      R{fixture.round}
                    </span>
                    <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                      <span className="text-sm font-medium text-ink-deep flex-1 truncate">{fixture.teamAName}</span>
                      <span className="text-sm font-bold text-ink-deep px-3 flex-shrink-0">
                        {fixture.status === 'completed'
                          ? <span className="text-primary">{fixture.scoreA} – {fixture.scoreB}</span>
                          : <span className="text-steel">vs</span>}
                      </span>
                      <span className="text-sm font-medium text-ink-deep flex-1 truncate text-right">{fixture.teamBName}</span>
                    </div>
                    <Badge
                      status={fixture.status === 'completed' ? 'confirmed' : 'pending'}
                      label={fixture.status}
                    />
                    {isOwner && fixture.status !== 'completed' && (
                      <button
                        onClick={() => setScoreModal({ open: true, idx, scoreA: '', scoreB: '' })}
                        className="btn-sm flex-shrink-0"
                      >
                        Score
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="card overflow-hidden">
            {standings.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-3xl mb-3">📊</p>
                <p className="text-slate text-sm">Standings will appear once fixtures are played</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    {['#', 'Team', 'P', 'W', 'D', 'L', 'GD', 'Pts'].map((h) => (
                      <th key={h} className={h === 'Team' ? 'text-left' : 'text-center'}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr key={s.teamId} className={i === 0 ? 'bg-primary-light font-medium' : ''}>
                      <td className="text-center text-steel text-sm">{i + 1}</td>
                      <td className="font-medium text-ink-deep">
                        {i === 0 && <span className="mr-1">🥇</span>}
                        {s.teamName}
                      </td>
                      {[s.played, s.won, s.drawn, s.lost].map((v, vi) => (
                        <td key={vi} className="text-center text-sm">{v}</td>
                      ))}
                      <td className="text-center text-sm">
                        {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                      </td>
                      <td className="text-center font-bold text-primary">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={scoreModal.open}
        onClose={() => setScoreModal({ open: false, idx: null, scoreA: '', scoreB: '' })}
        title="Update match score"
      >
        {scoreModal.idx !== null && tournament.fixtures[scoreModal.idx] && (
          <div className="space-y-5">
            <p className="text-sm text-slate text-center">
              {tournament.fixtures[scoreModal.idx].teamAName}
              <span className="mx-2 text-steel font-medium">vs</span>
              {tournament.fixtures[scoreModal.idx].teamBName}
            </p>
            <div className="flex gap-4 items-end">
              <div className="flex-1 input-group">
                <label className="input-label text-center block">{tournament.fixtures[scoreModal.idx].teamAName}</label>
                <input
                  type="number" min="0"
                  className="input text-center text-xl font-bold"
                  value={scoreModal.scoreA}
                  onChange={(e) => setScoreModal({ ...scoreModal, scoreA: e.target.value })}
                />
              </div>
              <span className="text-steel font-medium mb-3 text-lg">—</span>
              <div className="flex-1 input-group">
                <label className="input-label text-center block">{tournament.fixtures[scoreModal.idx].teamBName}</label>
                <input
                  type="number" min="0"
                  className="input text-center text-xl font-bold"
                  value={scoreModal.scoreB}
                  onChange={(e) => setScoreModal({ ...scoreModal, scoreB: e.target.value })}
                />
              </div>
            </div>
            <button onClick={handleSaveScore} disabled={savingScore} className="btn-primary w-full">
              {savingScore ? <Spinner size="sm" /> : 'Save score'}
            </button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={teamModal}
        onClose={() => { setTeamModal(false); setTeamForm({ teamName: '', description: '' }); }}
        title="Create a team"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div className="input-group">
            <label className="input-label">Team name *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Thunder FC"
              value={teamForm.teamName}
              onChange={(e) => setTeamForm(f => ({ ...f, teamName: e.target.value }))}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Description (optional)</label>
            <textarea
              className="input h-20 resize-none"
              placeholder="Short description about your team"
              value={teamForm.description}
              onChange={(e) => setTeamForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setTeamModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={creatingTeam} className="btn-primary flex-1">
              {creatingTeam ? <Spinner size="sm" /> : 'Create team'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TournamentDetailPage;
