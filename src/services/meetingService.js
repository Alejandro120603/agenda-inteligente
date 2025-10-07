import api from './api.js';

const mockMeetings = [
  {
    id: 1,
    title: 'Planificación Sprint',
    date: '2023-12-12T15:00:00Z',
    team: 'Producto',
    status: 'Confirmada'
  },
  {
    id: 2,
    title: 'Revisión de Roadmap',
    date: '2023-12-14T17:00:00Z',
    team: 'Dirección',
    status: 'Pendiente'
  }
];

export async function fetchUpcomingMeetings() {
  await api.get('/posts');
  return mockMeetings.slice(0, 2);
}

export async function fetchAllMeetings() {
  await api.get('/posts');
  return mockMeetings;
}

export async function createMeeting(payload) {
  await api.post('/posts', payload);
  const newMeeting = {
    id: Date.now(),
    status: 'Pendiente',
    ...payload
  };
  mockMeetings.push(newMeeting);
  return newMeeting;
}
