const { generateRoundRobinFixtures, calculateStandings } = require('../utils/fixtureGenerator');
const mongoose = require('mongoose');

const makeTeam = (name) => ({ _id: new mongoose.Types.ObjectId(), teamName: name });

describe('Fixture Generator', () => {
  describe('generateRoundRobinFixtures', () => {
    it('should generate correct number of fixtures for even teams', () => {
      const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C'), makeTeam('D')];
      const fixtures = generateRoundRobinFixtures(teams, new Date());
      expect(fixtures.length).toBe(6);
    });

    it('should generate correct number of fixtures for odd teams (with BYE)', () => {
      const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C')];
      const fixtures = generateRoundRobinFixtures(teams, new Date());
      expect(fixtures.length).toBe(3);
    });

    it('should not include BYE fixtures', () => {
      const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C')];
      const fixtures = generateRoundRobinFixtures(teams, new Date());
      fixtures.forEach((f) => {
        expect(f.teamA).not.toBeNull();
        expect(f.teamB).not.toBeNull();
      });
    });

    it('should set initial scores to null', () => {
      const teams = [makeTeam('A'), makeTeam('B')];
      const fixtures = generateRoundRobinFixtures(teams, new Date());
      expect(fixtures[0].scoreA).toBeNull();
      expect(fixtures[0].scoreB).toBeNull();
    });
  });

  describe('calculateStandings', () => {
    it('should correctly calculate standings after matches', () => {
      const teams = [makeTeam('A'), makeTeam('B'), makeTeam('C')];
      const fixtures = [
        { teamA: teams[0]._id, teamB: teams[1]._id, scoreA: 3, scoreB: 1, status: 'completed' },
        { teamA: teams[1]._id, teamB: teams[2]._id, scoreA: 2, scoreB: 2, status: 'completed' },
        { teamA: teams[0]._id, teamB: teams[2]._id, scoreA: 0, scoreB: 1, status: 'completed' },
      ];
      const standings = calculateStandings(fixtures, teams);
      const teamC = standings.find((s) => s.teamName === 'C');
      const teamA = standings.find((s) => s.teamName === 'A');
      const teamB = standings.find((s) => s.teamName === 'B');
      expect(teamC.points).toBe(4);
      expect(teamA.points).toBe(3);
      expect(teamB.points).toBe(1);
      expect(standings[0].points).toBeGreaterThanOrEqual(standings[1].points);
    });
  });
});
