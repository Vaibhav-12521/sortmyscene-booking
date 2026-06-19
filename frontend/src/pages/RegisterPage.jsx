import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      const detail = err.details?.[0]?.message;
      setError(detail ? `${err.message}: ${detail}` : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth fade-in">
      <div className="card auth__card">
        <span className="eyebrow">Join the scene</span>
        <h1 className="auth__title">Create your account</h1>
        <p className="auth__subtitle">Sign up to start booking tickets.</p>
        <Alert variant="error" onClose={() => setError('')}>{error}</Alert>
        <form onSubmit={onSubmit} className="form">
          <label className="field">
            <span>Full name</span>
            <input type="text" name="name" value={form.name} onChange={onChange} required minLength={2} />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" value={form.email} onChange={onChange} required autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <small className="field__hint">At least 6 characters.</small>
          </label>
          <button className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="auth__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
