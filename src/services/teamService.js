import api from './api.js';

let teams = [
  {
    id: 1,
    name: 'Equipo de Producto',
    members: ['Ana', 'Luis', 'María']
  },
  {
    id: 2,
    name: 'Marketing LATAM',
    members: ['Carlos', 'Valentina']
  }
];

export async function fetchTeams() {
  await api.get('/albums');
  return teams;
}

export async function createTeam(payload) {
  await api.post('/albums', payload);
  const newTeam = { id: Date.now(), members: [], ...payload };
  teams = [...teams, newTeam];
  return newTeam;
}

export async function inviteMember(teamId, email) {
  await api.post('/comments', { teamId, email });
  teams = teams.map((team) =>
    team.id === teamId ? { ...team, members: [...team.members, email] } : team
  );
  return teams.find((team) => team.id === teamId);
}
