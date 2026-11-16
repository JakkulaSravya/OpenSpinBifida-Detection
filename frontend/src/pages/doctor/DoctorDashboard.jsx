import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { ClipboardList, Calendar, FolderOpen, Users, TrendingUp } from 'lucide-react';

export default function DoctorDashboard() {
    const { user, api } = useAuth();
    const [consultations, setConsultations] = useState([]);
    const [cases, setCases] = useState([]);

    useEffect(() => {
        api.get('/doctor/consultations').then(r => setConsultations(r.data)).catch(() => { });
        api.get('/doctor/cases').then(r => setCases(r.data.cases || [])).catch(() => { });
    }, []);

    const pending = consultations.filter(c => c.status === 'pending').length;
    const today = consultations.filter(c => c.status === 'accepted' && c.date === new Date().toISOString().split('T')[0]).length;

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Doctor Dashboard" />
                <div className="page-content fade-in">
                    <div className="page-header">
                        <h1>Welcome, Dr. {user?.name?.split(' ').pop()} 👋</h1>
                        <p>Manage consultations and patient cases</p>
                    </div>

                    <div className="stats-grid">
                        <div className="glass-card stat-card"><div className="stat-icon orange"><ClipboardList size={22} /></div><div className="stat-info"><h3>{pending}</h3><p>Pending Requests</p></div></div>
                        <div className="glass-card stat-card"><div className="stat-icon blue"><Calendar size={22} /></div><div className="stat-info"><h3>{today}</h3><p>Today's Consultations</p></div></div>
                        <div className="glass-card stat-card"><div className="stat-icon green"><FolderOpen size={22} /></div><div className="stat-info"><h3>{cases.length}</h3><p>Total Cases</p></div></div>
                        <div className="glass-card stat-card"><div className="stat-icon purple"><TrendingUp size={22} /></div><div className="stat-info"><h3>{user?.rating || 4.5}</h3><p>Patient Rating</p></div></div>
                    </div>

                    <div className="grid-2">
                        <div className="glass-card">
                            <div className="card-header"><h3>Recent Consultation Requests</h3></div>
                            <div className="card-body">
                                {consultations.slice(0, 5).map(c => (
                                    <div key={c._id} className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{c.patientId?.name || 'Patient'}</p>
                                            <p className="text-xs text-slate">{c.date} — {c.timeSlot}</p>
                                        </div>
                                        <span className={`status-badge ${c.status}`}>{c.status}</span>
                                    </div>
                                ))}
                                {consultations.length === 0 && <div className="empty-state" style={{ padding: 30 }}><Users size={30} /><p className="text-xs">No requests yet</p></div>}
                            </div>
                        </div>

                        <div className="glass-card">
                            <div className="card-header"><h3>Quick Stats</h3></div>
                            <div className="card-body">
                                <div className="settings-row"><div className="settings-row-info"><h4>Specialization</h4></div><p className="text-sm text-teal">{user?.specialization}</p></div>
                                <div className="settings-row"><div className="settings-row-info"><h4>Hospital</h4></div><p className="text-sm text-slate">{user?.hospital || 'Not set'}</p></div>
                                <div className="settings-row"><div className="settings-row-info"><h4>Experience</h4></div><p className="text-sm text-slate">{user?.experience || 0} years</p></div>
                                <div className="settings-row"><div className="settings-row-info"><h4>Consultation Fee</h4></div><p className="text-sm text-slate">₹{user?.consultationFee || 500}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
