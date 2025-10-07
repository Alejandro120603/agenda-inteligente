import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import Input from '../components/Input.jsx';
import { createMeeting, fetchAllMeetings } from '../services/meetingService.js';

function MeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [filter, setFilter] = useState({ team: '', date: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', team: '' });

  useEffect(() => {
    const load = async () => {
      const data = await fetchAllMeetings();
      setMeetings(data);
    };
    load();
  }, []);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      const matchTeam = filter.team ? meeting.team === filter.team : true;
      const matchDate = filter.date ? meeting.date.startsWith(filter.date) : true;
      return matchTeam && matchDate;
    });
  }, [meetings, filter]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const newMeeting = await createMeeting({ ...form, date: new Date(form.date).toISOString() });
    setMeetings((prev) => [...prev, newMeeting]);
    setIsModalOpen(false);
    setForm({ title: '', date: '', team: '' });
  };

  const teams = Array.from(new Set(meetings.map((meeting) => meeting.team)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reuniones</h1>
          <p className="text-sm text-slate-500">Visualiza y organiza todas tus reuniones en un solo lugar.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Crear reunión</Button>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Equipo
              <select
                value={filter.team}
                onChange={(event) => setFilter((prev) => ({ ...prev, team: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Fecha
              <input
                type="date"
                value={filter.date}
                onChange={(event) => setFilter((prev) => ({ ...prev, date: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
          <Button variant="ghost" onClick={() => setFilter({ team: '', date: '' })}>
            Limpiar filtros
          </Button>
        </div>

        <div className="grid gap-4">
          {filteredMeetings.map((meeting) => (
            <div key={meeting.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{meeting.title}</h3>
                  <p className="text-sm text-slate-500">
                    {new Date(meeting.date).toLocaleString('es-ES', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="rounded-full bg-brand-100 px-3 py-1 font-medium text-brand-700">{meeting.team}</span>
                  <span className="text-slate-500">{meeting.status}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredMeetings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
              No encontramos reuniones para estos filtros.
            </div>
          )}
        </div>
      </Card>

      <Modal
        title="Crear reunión"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="create-meeting-form">
              Guardar
            </Button>
          </>
        }
      >
        <form id="create-meeting-form" className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Título"
            name="title"
            required
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <Input
            label="Fecha y hora"
            name="date"
            type="datetime-local"
            required
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
          />
          <Input
            label="Equipo"
            name="team"
            required
            value={form.team}
            onChange={(event) => setForm((prev) => ({ ...prev, team: event.target.value }))}
          />
        </form>
      </Modal>
    </div>
  );
}

export default MeetingsPage;
