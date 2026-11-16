import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [role, setRole] = useState('patient');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password, role);
            navigate(`/${role}/dashboard`);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-container fade-in">
                <div className="auth-logo">
                    <div className="logo-icon"><Brain size={28} color="white" /></div>
                    <h1>OSBCheck</h1>
                    <p>Prenatal Spina Bifida Detection</p>
                </div>

                <div className="auth-tabs">
                    <button className={`auth-tab ${role === 'patient' ? 'active' : ''}`} onClick={() => setRole('patient')}>Patient</button>
                    <button className={`auth-tab ${role === 'doctor' ? 'active' : ''}`} onClick={() => setRole('doctor')}>Doctor</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" className="form-input" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showPw ? 'text' : 'password'} className="form-input" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: '40px' }} />
                            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--slate-500)' }}>
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && <p className="error-text mb-4">{error}</p>}

                    <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                        {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> : 'Sign In'}
                    </button>
                </form>

                <p className="text-center mt-6 text-sm text-slate">
                    Don't have an account? <Link to="/register" className="link-blue">Create Account</Link>
                </p>
            </div>
        </div>
    );
}
