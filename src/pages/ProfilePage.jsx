import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Perfil</h1>
        <p className="text-sm text-slate-500">Gestiona tu información personal y conexiones de calendario.</p>
      </div>

      <Card className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Información personal</h2>
          <dl className="mt-4 grid gap-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Nombre</dt>
              <dd>{user?.name || 'Invitado'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Correo</dt>
              <dd>{user?.email || 'sin-correo@agenda.com'}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Calendarios conectados</h2>
          <p className="text-sm text-slate-500">Integra tus calendarios para que Agenda Inteligente programe automáticamente.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary">Conectar Google Calendar</Button>
            <Button variant="secondary">Conectar Outlook</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ProfilePage;
