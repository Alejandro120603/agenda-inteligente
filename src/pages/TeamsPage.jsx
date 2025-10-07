import { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import Modal from '../components/Modal.jsx';
import { createTeam, fetchTeams, inviteMember } from '../services/teamService.js';
import { useToast } from '../hooks/useToast.js';

function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      const data = await fetchTeams();
      setTeams(data);
    };
    load();
  }, []);

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    const newTeam = await createTeam({ name: teamName });
    setTeams((prev) => [...prev, newTeam]);
    setTeamName('');
    setIsCreateOpen(false);
    toast.success('Equipo creado');
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    if (!selectedTeam) return;
    const updated = await inviteMember(selectedTeam.id, inviteEmail);
    setTeams((prev) => prev.map((team) => (team.id === updated.id ? updated : team)));
    setInviteEmail('');
    setIsInviteOpen(false);
    toast.info(`Invitación enviada a ${inviteEmail}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Equipos</h1>
          <p className="text-sm text-slate-500">Gestiona tus equipos y comparte disponibilidad en segundos.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>Crear equipo</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((team) => (
          <Card key={team.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{team.name}</h2>
                <p className="text-sm text-slate-500">{team.members.length} miembros</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedTeam(team);
                  setIsInviteOpen(true);
                }}
              >
                Invitar
              </Button>
            </div>
            <ul className="flex flex-wrap gap-2 text-sm text-slate-600">
              {team.members.map((member) => (
                <li key={member} className="rounded-full bg-slate-100 px-3 py-1">
                  {member}
                </li>
              ))}
              {team.members.length === 0 && <li className="text-slate-400">Aún sin miembros</li>}
            </ul>
          </Card>
        ))}
        {teams.length === 0 && (
          <Card className="col-span-full text-center text-sm text-slate-500">
            No perteneces a ningún equipo todavía.
          </Card>
        )}
      </div>

      <Modal
        title="Crear equipo"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTeam} disabled={!teamName.trim()}>
              Crear
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleCreateTeam}>
          <Input label="Nombre del equipo" value={teamName} onChange={(event) => setTeamName(event.target.value)} required />
        </form>
      </Modal>

      <Modal
        title={`Invitar a ${selectedTeam?.name || ''}`}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setIsInviteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim()}>
              Enviar invitación
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleInvite}>
          <Input
            label="Correo del miembro"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            required
          />
        </form>
      </Modal>
    </div>
  );
}

export default TeamsPage;
