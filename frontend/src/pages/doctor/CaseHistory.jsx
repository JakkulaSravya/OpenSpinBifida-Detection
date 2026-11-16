import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getBackendOrigin } from '../../config';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { FolderOpen, Download, FileText, Save } from 'lucide-react';

export default function CaseHistory() {
    const { api } = useAuth();
    const [cases, setCases] = useState([]);
    const [reports, setReports] = useState([]);
    const [selected, setSelected] = useState(null);
    const [diagNotes, setDiagNotes] = useState('');
    const [loading, setLoading] = useState(true);

    const load = () => {
        api.get('/doctor/cases').then(r => {
            setCases(r.data.cases || []);
            setReports(r.data.reports || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };
    useEffect(load, []);

    const saveNotes = async (id) => {
        try {
            await api.post(`/doctor/case-notes/${id}`, { diagnosisNotes: diagNotes });
            setDiagNotes('');
            load();
        } catch { }
    };

    const getPatientReports = (patientId) => reports.filter(r => r.patientId === patientId);
    const backendOrigin = getBackendOrigin();

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Case History" />
                <div className="page-content fade-in">
                    <div className="page-header"><h1>Clinical Case History</h1><p>Review past consultations and manage diagnosis records</p></div>

                    {loading ? <div className="page-loader"><div className="spinner"></div></div> : (
                        <div className="grid-2">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {cases.length === 0 ? (
                                    <div className="glass-card"><div className="empty-state"><FolderOpen size={48} /><h3>No Cases</h3><p>Completed consultations will appear here.</p></div></div>
                                ) : cases.map(c => (
                                    <div key={c._id} className="glass-card" style={{ padding: 20, cursor: 'pointer', borderColor: selected?._id === c._id ? 'rgba(37,99,235,0.4)' : undefined }} onClick={() => { setSelected(c); setDiagNotes(c.diagnosisNotes || ''); }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-semibold text-white text-sm">{c.patientId?.name || 'Patient'}</p>
                                            <span className={`status-badge ${c.status}`}>{c.status}</span>
                                        </div>
                                        <p className="text-xs text-slate">{c.date} — {c.timeSlot}</p>
                                        {c.diagnosisNotes && <p className="text-xs text-teal mt-1">Notes: {c.diagnosisNotes.substring(0, 60)}...</p>}
                                    </div>
                                ))}
                            </div>

                            {selected && (
                                <div className="glass-card slide-up">
                                    <div className="card-header"><h3>Case Details</h3></div>
                                    <div className="card-body">
                                        <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-white">Patient: {selected.patientId?.name}</h4>
                                            <p className="text-xs text-slate">Age: {selected.patientId?.age} | Gestational: {selected.patientId?.gestationalAge} weeks</p>
                                        </div>

                                        <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-white mb-2">ML Screening Reports</h4>
                                            {getPatientReports(selected.patientId?._id).length === 0 ? (
                                                <p className="text-xs text-slate">No ML reports available.</p>
                                            ) : getPatientReports(selected.patientId?._id).map(r => (
                                                <div key={r._id} className="flex items-center justify-between" style={{ padding: '8px', background: 'var(--navy-800)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                                                    <div>
                                                        <span className={`risk-badge ${r.riskLevel?.toLowerCase()}`}>{r.riskLevel}</span>
                                                        <span className="text-xs text-slate" style={{ marginLeft: 8 }}>BS/BSOB: {r.bsRatio}</span>
                                                    </div>
                                                    {r.pdfUrl && <a href={`${backendOrigin}${r.pdfUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm"><Download size={12} /> PDF</a>}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="form-group">
                                            <label>Diagnosis Notes</label>
                                            <textarea className="form-textarea" placeholder="Add clinical observations, diagnosis, treatment plan..." value={diagNotes} onChange={e => setDiagNotes(e.target.value)} style={{ minHeight: 120 }} />
                                        </div>
                                        <button className="btn btn-primary" onClick={() => saveNotes(selected._id)}>
                                            <Save size={16} /> Save Notes
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
