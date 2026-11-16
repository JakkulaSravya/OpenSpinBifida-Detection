import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { FileText, Calendar, Activity, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

export default function PatientDashboard() {
    const { user, api } = useAuth();
    const [reports, setReports] = useState([]);
    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        api.get('/patient/reports').then(r => setReports(r.data)).catch(() => { });
        api.get('/patient/appointments').then(r => setAppointments(r.data)).catch(() => { });
    }, []);

    const latestReport = reports[0];
    const pendingAppts = appointments.filter(a => a.status === 'pending').length;

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Patient Dashboard" />
                <div className="page-content fade-in">
                    <div className="page-header">
                        <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
                        <p>Monitor your prenatal screening results and upcoming consultations</p>
                    </div>

                    <div className="stats-grid">
                        <div className="glass-card stat-card">
                            <div className="stat-icon blue"><FileText size={22} /></div>
                            <div className="stat-info">
                                <h3>{reports.length}</h3>
                                <p>Total Screenings</p>
                            </div>
                        </div>
                        <div className="glass-card stat-card">
                            <div className="stat-icon teal"><Activity size={22} /></div>
                            <div className="stat-info">
                                <h3>{latestReport?.riskLevel || 'N/A'}</h3>
                                <p>Latest Risk Level</p>
                                {latestReport && <span className={`stat-trend ${latestReport.riskLevel === 'Low' ? 'up' : 'down'}`}>{latestReport.riskLevel === 'Low' ? '✓ Normal' : '⚠ Attention'}</span>}
                            </div>
                        </div>
                        <div className="glass-card stat-card">
                            <div className="stat-icon orange"><Calendar size={22} /></div>
                            <div className="stat-info">
                                <h3>{pendingAppts}</h3>
                                <p>Pending Appointments</p>
                            </div>
                        </div>
                        <div className="glass-card stat-card">
                            <div className="stat-icon green"><TrendingUp size={22} /></div>
                            <div className="stat-info">
                                <h3>{user?.gestationalAge || '—'}</h3>
                                <p>Gestational Age (weeks)</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="glass-card">
                            <div className="card-header">
                                <h3>Latest Screening Result</h3>
                            </div>
                            <div className="card-body">
                                {latestReport ? (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`risk-badge ${latestReport.riskLevel?.toLowerCase()}`}>
                                                {latestReport.riskLevel} Risk
                                            </span>
                                            <span className="text-xs text-slate">{new Date(latestReport.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm" style={{ color: latestReport.classification === 'Open Spina Bifida Detected' ? 'var(--red-400)' : 'var(--green-400)' }}>
                                            {latestReport.classification === 'Normal' ? 'No OSB Detected' : latestReport.classification}
                                        </p>
                                        <div className="report-metrics mt-4">
                                            <div className="report-metric">
                                                <div className="report-metric-value">{latestReport.bsRatio}</div>
                                                <div className="report-metric-label">BS/BSOB Ratio</div>
                                            </div>
                                            <div className="report-metric">
                                                <div className="report-metric-value">{latestReport.riskScore}/100</div>
                                                <div className="report-metric-label">Risk Score</div>
                                            </div>
                                            <div className="report-metric">
                                                <div className="report-metric-value">{latestReport.bsValue}mm</div>
                                                <div className="report-metric-label">Brain Stem</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="empty-state" style={{ padding: '30px' }}>
                                        <Activity size={36} />
                                        <h3>No Screenings Yet</h3>
                                        <p>Upload an ultrasound image to begin your first ML analysis</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="glass-card">
                            <div className="card-header">
                                <h3>Upcoming Appointments</h3>
                            </div>
                            <div className="card-body">
                                {appointments.length > 0 ? (
                                    appointments.slice(0, 3).map(appt => (
                                        <div key={appt._id} className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{appt.doctorId?.name || 'Doctor'}</p>
                                                <p className="text-xs text-slate"><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />{appt.date} at {appt.timeSlot}</p>
                                            </div>
                                            <span className={`status-badge ${appt.status}`}>{appt.status}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state" style={{ padding: '30px' }}>
                                        <Calendar size={36} />
                                        <h3>No Appointments</h3>
                                        <p>Book a consultation with a specialist</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {latestReport && latestReport.riskLevel !== 'Low' && (
                        <div className="glass-card mt-6" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                            <div className="card-body flex items-center gap-3">
                                <AlertTriangle size={20} color="var(--yellow-400)" />
                                <div>
                                    <p className="text-sm font-semibold text-white">Action Required</p>
                                    <p className="text-xs text-slate">Your latest screening indicates {latestReport.riskLevel.toLowerCase()} risk. We recommend booking a consultation with a fetal medicine specialist.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
