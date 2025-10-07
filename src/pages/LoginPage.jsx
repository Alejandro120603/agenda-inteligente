import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(form);
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
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder="tu@empresa.com"
        />
        <Input
          label="Contraseña"
          name="password"
          type="password"
          required
          value={form.password}
          onChange={handleChange}
          placeholder="••••••••"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Iniciando...' : 'Iniciar sesión'}
      </Button>
      <p className="text-center text-sm text-slate-500">
        ¿Aún no tienes cuenta?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Crea una ahora
        </Link>
      </p>
    </form>
  );
}

export default LoginPage;
