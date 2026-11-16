import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain } from 'lucide-react';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [role, setRole] = useState('patient');
    const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', age: '', gestationalAge: '', trimester: '', specialization: '', licenseNumber: '', hospital: '', experience: '', consultationFee: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register({ ...form, role, age: Number(form.age) || undefined, gestationalAge: Number(form.gestationalAge) || undefined, experience: Number(form.experience) || undefined, consultationFee: Number(form.consultationFee) || undefined });
            navigate(`/${role}/dashboard`);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed.');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-container fade-in" style={{ maxWidth: '520px' }}>
                <div className="auth-logo">
                    <div className="logo-icon"><Brain size={28} color="white" /></div>
                    <h1>Create Account</h1>
                    <p>Join OSBCheck Platform</p>
                </div>

                <div className="auth-tabs">
                    <button className={`auth-tab ${role === 'patient' ? 'active' : ''}`} onClick={() => setRole('patient')}>Patient</button>
                    <button className={`auth-tab ${role === 'doctor' ? 'active' : ''}`} onClick={() => setRole('doctor')}>Doctor</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input className="form-input" placeholder="Your name" value={form.name} onChange={e => update('name', e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Age *</label>
                            <input className="form-input" type="number" placeholder="Age" value={form.age} onChange={e => update('age', e.target.value)} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Email Address *</label>
                        <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => update('email', e.target.value)} required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Password *</label>
                            <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => update('password', e.target.value)} required minLength={6} />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input className="form-input" type="tel" placeholder="Phone number" value={form.phone} onChange={e => update('phone', e.target.value)} />
                        </div>
                    </div>

                    {role === 'patient' && (
                        <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Gestational Age (weeks)</label>
                                    <input className="form-input" type="number" placeholder="e.g. 20" value={form.gestationalAge} onChange={e => update('gestationalAge', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Trimester</label>
                                    <select className="form-select" value={form.trimester} onChange={e => update('trimester', e.target.value)}>
                                        <option value="">Select</option>
                                        <option value="first">First (1-12 weeks)</option>
                                        <option value="second">Second (13-26 weeks)</option>
                                        <option value="third">Third (27-40 weeks)</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {role === 'doctor' && (
                        <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Specialization *</label>
                                    <select className="form-select" value={form.specialization} onChange={e => update('specialization', e.target.value)} required>
                                        <option value="">Select</option>
                                        <option value="Fetal Medicine Specialist">Fetal Medicine Specialist</option>
                                        <option value="Obstetrician & Gynecologist">Obstetrician & Gynecologist</option>
                                        <option value="Pediatric Neurosurgeon">Pediatric Neurosurgeon</option>
                                        <option value="Genetic Counselor">Genetic Counselor</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Medical License # *</label>
                                    <input className="form-input" placeholder="License number" value={form.licenseNumber} onChange={e => update('licenseNumber', e.target.value)} required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Hospital Affiliation</label>
                                    <input className="form-input" placeholder="Hospital name" value={form.hospital} onChange={e => update('hospital', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Years of Experience</label>
                                    <input className="form-input" type="number" placeholder="e.g. 10" value={form.experience} onChange={e => update('experience', e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Consultation Fee (₹)</label>
                                <input className="form-input" type="number" placeholder="e.g. 500" value={form.consultationFee} onChange={e => update('consultationFee', e.target.value)} />
                            </div>
                        </>
                    )}

                    {error && <p className="error-text mb-4">{error}</p>}

                    <button type="submit" className="btn btn-primary btn-block btn-lg mt-2" disabled={loading}>
                        {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> : 'Create Account'}
                    </button>
                </form>

                <p className="text-center mt-6 text-sm text-slate">
                    Already have an account? <Link to="/login" className="link-blue">Sign In</Link>
                </p>
            </div>
        </div>
    );
}
