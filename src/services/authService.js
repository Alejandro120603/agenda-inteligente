import api from './api.js';

const mockUsers = new Map([
  [
    'demo@agenda.com',
    {
      id: 0,
      name: 'Demo User',
      email: 'demo@agenda.com',
      password: 'demo123',
      teamPreference: 'create',
      teams: ['Producto', 'Marketing LATAM']
    }
  ]
]);
let idCounter = 1;

export async function loginRequest({ email, password }) {
  await api.get('/users');
  const existing = Array.from(mockUsers.values()).find((user) => user.email === email);

  if (!existing || existing.password !== password) {
    throw new Error('Credenciales inválidas');
  }

  return existing;
}

export async function registerRequest({ name, email, password, teamPreference }) {
  await api.get('/users');
  if (mockUsers.has(email)) {
    throw new Error('El usuario ya existe');
  }

  const newUser = {
    id: idCounter++,
    name,
    email,
    password,
    teamPreference,
    teams: teamPreference === 'create' ? ['Nuevo equipo'] : ['Equipo de Marketing']
  };
  mockUsers.set(email, newUser);
  return newUser;
}

export async function fetchProfile(id) {
  await api.get(`/users/${id}`);
  let user = Array.from(mockUsers.values()).find((item) => item.id === id);
  if (!user) {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('agenda-user') : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.id === id) {
        mockUsers.set(parsed.email, parsed);
        user = parsed;
      }
    }
  }
  if (!user) {
    throw new Error('Sesión expirada');
  }
  return user;
}
