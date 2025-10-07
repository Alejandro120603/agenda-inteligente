import { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import Input from '../components/Input.jsx';
import { fetchUpcomingMeetings, createMeeting } from '../services/meetingService.js';
import Loader from '../components/Loader.jsx';

function DashboardPage() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', team: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchUpcomingMeetings();
        setMeetings(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const newMeeting = await createMeeting({ ...form, date: new Date(form.date).toISOString() });
      setMeetings((prev) => [newMeeting, ...prev]);
      setIsModalOpen(false);
      setForm({ title: '', date: '', team: '' });
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Hola de nuevo 👋</h1>
          <p className="text-sm text-slate-500">Gestiona tus próximas reuniones y coordina a tu equipo.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Programar reunión</Button>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Próximas reuniones</h2>
            <Button variant="ghost" className="text-sm" onClick={() => setIsModalOpen(true)}>
              Nueva
            </Button>
          </div>
          {loading ? (
            <div className="py-12">
              <Loader label="Cargando reuniones" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Aún no tienes reuniones planificadas.
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{meeting.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(meeting.date).toLocaleString('es-ES', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}{' '}
                      · {meeting.team}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-brand-600">{meeting.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Actividad reciente</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="rounded-2xl bg-slate-50 px-4 py-3">
              ✅ El equipo de Producto confirmó la reunión de retrospectiva.
            </li>
            <li className="rounded-2xl bg-slate-50 px-4 py-3">
              📩 Invitaste a valentina@empresa.com a Marketing LATAM.
            </li>
            <li className="rounded-2xl bg-slate-50 px-4 py-3">
              🕒 Agenda Inteligente está sincronizando con Google Calendar.
            </li>
          </ul>
        </Card>
      </section>

      <Modal
        title="Programar nueva reunión"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="schedule-meeting-form" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form id="schedule-meeting-form" className="space-y-4" onSubmit={handleSubmit}>
          <Input label="Título" name="title" required value={form.title} onChange={handleChange} />
          <Input label="Fecha y hora" name="date" type="datetime-local" required value={form.date} onChange={handleChange} />
          <Input label="Equipo" name="team" required value={form.team} onChange={handleChange} />
        </form>
      </Modal>
    </div>
  );
}

export default DashboardPage;
