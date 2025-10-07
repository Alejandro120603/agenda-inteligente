import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', teamPreference: 'create' });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <Input label="Nombre completo" name="name" required value={form.name} onChange={handleChange} />
        <Input label="Correo electrónico" name="email" type="email" required value={form.email} onChange={handleChange} />
        <Input label="Contraseña" name="password" type="password" required value={form.password} onChange={handleChange} />
        <label className="flex flex-col space-y-2 text-sm">
          <span className="font-medium text-slate-700">¿Qué deseas hacer?</span>
          <select
            name="teamPreference"
            value={form.teamPreference}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="create">Crear un nuevo equipo</option>
            <option value="join">Unirme a un equipo existente</option>
          </select>
        </label>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </Button>
    </form>
  );
}

export default RegisterPage;
