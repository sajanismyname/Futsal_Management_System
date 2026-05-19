/**
 * Generates a round-robin fixture schedule for given teams.
 * Handles odd number of teams by adding a "BYE" placeholder.
 *
 * @param {Array} teams - Array of team objects with _id and teamName
 * @param {Date} startDate - Tournament start date
 * @returns {Array} fixtures array
 */
const generateRoundRobinFixtures = (teams, startDate) => {
  let participants = [...teams];

  if (participants.length % 2 !== 0) {
    participants.push({ _id: null, teamName: 'BYE' });
  }

  const n = participants.length;
  const rounds = n - 1;
  const matchesPerRound = n / 2;
  const fixtures = [];

  const tourneyTeams = [...participants];

  for (let round = 0; round < rounds; round++) {
    const roundDate = new Date(startDate);
    roundDate.setDate(roundDate.getDate() + round);

    for (let match = 0; match < matchesPerRound; match++) {
      const home = tourneyTeams[match];
      const away = tourneyTeams[n - 1 - match];

      if (home._id !== null && away._id !== null) {
        fixtures.push({
          teamA: home._id,
          teamB: away._id,
          teamAName: home.teamName,
          teamBName: away.teamName,
          round: round + 1,
          date: new Date(roundDate),
          scoreA: null,
          scoreB: null,
          status: 'scheduled',
        });
      }
    }

    // Rotate teams (keep index 0 fixed)
    tourneyTeams.splice(1, 0, tourneyTeams.pop());
  }

  return fixtures;
};

/**
 * Calculates standings from fixtures.
 * @param {Array} fixtures - Array of fixture objects
 * @param {Array} teams - Array of team objects
 * @returns {Array} sorted standings
 */
const calculateStandings = (fixtures, teams) => {
  const standingsMap = {};

  teams.forEach((team) => {
    standingsMap[team._id.toString()] = {
      teamId: team._id,
      teamName: team.teamName,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  });

  fixtures
    .filter((f) => f.status === 'completed' && f.scoreA !== null && f.scoreB !== null)
    .forEach((fixture) => {
      const teamA = standingsMap[fixture.teamA.toString()];
      const teamB = standingsMap[fixture.teamB.toString()];

      if (!teamA || !teamB) return;

      teamA.played += 1;
      teamB.played += 1;
      teamA.goalsFor += fixture.scoreA;
      teamA.goalsAgainst += fixture.scoreB;
      teamB.goalsFor += fixture.scoreB;
      teamB.goalsAgainst += fixture.scoreA;

      if (fixture.scoreA > fixture.scoreB) {
        teamA.won += 1;
        teamA.points += 3;
        teamB.lost += 1;
      } else if (fixture.scoreA < fixture.scoreB) {
        teamB.won += 1;
        teamB.points += 3;
        teamA.lost += 1;
      } else {
        teamA.drawn += 1;
        teamA.points += 1;
        teamB.drawn += 1;
        teamB.points += 1;
      }
    });

  return Object.values(standingsMap)
    .map((s) => ({
      ...s,
      goalDifference: s.goalsFor - s.goalsAgainst,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
};

module.exports = { generateRoundRobinFixtures, calculateStandings };
