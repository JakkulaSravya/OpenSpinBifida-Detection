import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getBackendOrigin } from '../../config';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { Check, X, FileText, User, Clock, AlertTriangle, CreditCard, CheckCircle, IndianRupee, Download } from 'lucide-react';

const STATUS_LABELS = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    payment_requested: 'Payment Requested',
    paid: '💰 Payment Done',
    confirmed: 'Confirmed ✅',
    completed: 'Completed',
    cancelled: 'Cancelled'
};

export default function ConsultationRequests() {
    const { api, user } = useAuth();
    const [consultations, setConsultations] = useState([]);
    const [selected, setSelected] = useState(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [feeAmount, setFeeAmount] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const load = () => {
        api.get('/doctor/consultations').then(r => { setConsultations(r.data); setLoading(false); }).catch(() => setLoading(false));
    };
    useEffect(load, []);

    const backendOrigin = getBackendOrigin();

    const handleAction = async (id, status) => {
        setActionLoading(true);
        try {
            await api.put(`/doctor/consultation/${id}`, { status, doctorNotes: notes });
            setNotes('');
            setSelected(null);
            load();
        } catch { }
        setActionLoading(false);
    };

    const handleRequestPayment = async (id) => {
        setActionLoading(true);
        try {
            const amount = feeAmount ? parseInt(feeAmount) : undefined;
            await api.post(`/payments/request-payment/${id}`, { amount });
            setFeeAmount('');
            setSelected(null);
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to request payment.');
        }
        setActionLoading(false);
    };

    const handleConfirmAppointment = async (id) => {
        setActionLoading(true);
        try {
            await api.put(`/doctor/confirm-appointment/${id}`);
            setSelected(null);
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to confirm appointment.');
        }
        setActionLoading(false);
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Consultation Requests" />
                <div className="page-content fade-in">
                    <div className="page-header"><h1>Patient Consultations</h1><p>Review, manage, and process appointment requests and payments</p></div>

                    {loading ? <div className="page-loader"><div className="spinner"></div></div> : (
                        <div className="grid-2">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {consultations.length === 0 ? (
                                    <div className="glass-card"><div className="empty-state"><FileText size={48} /><h3>No Requests</h3><p>You'll see patient consultation requests here.</p></div></div>
                                ) : consultations.map(c => (
                                    <div key={c._id} className="glass-card" style={{ padding: 20, cursor: 'pointer', borderColor: selected?._id === c._id ? 'rgba(37,99,235,0.4)' : undefined }} onClick={() => { setSelected(c); setFeeAmount(''); }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="doctor-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', background: 'linear-gradient(135deg, #14b8a6, #2563eb)' }}>{(c.patientId?.name || 'P').charAt(0)}</div>
                                                <div>
                                                    <p className="font-semibold text-white text-sm">{c.patientId?.name || 'Patient'}</p>
                                                    <p className="text-xs text-slate">{c.patientId?.email}</p>
                                                </div>
                                            </div>
                                            <span className={`status-badge ${c.status}`}>
                                                {STATUS_LABELS[c.status] || c.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate mt-2">
                                            <span><Clock size={12} style={{ display: 'inline' }} /> {c.date} — {c.timeSlot}</span>
                                            {c.riskLevel && <span className={`risk-badge ${c.riskLevel?.toLowerCase()}`}>{c.riskLevel}</span>}
                                        </div>
                                        {c.paymentAmount && (
                                            <div className="text-xs mt-2" style={{ color: 'var(--teal-400)' }}>
                                                <IndianRupee size={11} style={{ display: 'inline' }} /> Fee: ₹{c.paymentAmount}
                                                {c.status === 'paid' && <span style={{ color: 'var(--green-400)', marginLeft: 8 }}>✅ Payment Received</span>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {selected && (
                                <div className="glass-card slide-up">
                                    <div className="card-header"><h3>Request Details</h3></div>
                                    <div className="card-body">
                                        <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-white mb-2"><User size={14} style={{ display: 'inline' }} /> Patient Info</h4>
                                            <p className="text-sm text-slate">Name: {selected.patientId?.name}</p>
                                            <p className="text-sm text-slate">Age: {selected.patientId?.age}</p>
                                            <p className="text-sm text-slate">Gestational Age: {selected.patientId?.gestationalAge} weeks</p>
                                            <p className="text-sm text-slate">Trimester: {selected.patientId?.trimester}</p>
                                        </div>

                                        {/* Pending → Accept / Reject */}
                                        {selected.status === 'pending' && (
                                            <div>
                                                <div className="form-group">
                                                    <label>Doctor's Notes</label>
                                                    <textarea className="form-textarea" placeholder="Add notes for the patient..." value={notes} onChange={e => setNotes(e.target.value)} />
                                                </div>
                                                <div className="flex gap-3">
                                                    <button className="btn btn-success flex-1" onClick={() => handleAction(selected._id, 'accepted')} disabled={actionLoading}>
                                                        <Check size={16} /> Accept
                                                    </button>
                                                    <button className="btn btn-danger flex-1" onClick={() => handleAction(selected._id, 'rejected')} disabled={actionLoading}>
                                                        <X size={16} /> Reject
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Accepted → Request Payment */}
                                        {selected.status === 'accepted' && (
                                            <div className="payment-action-area">
                                                <h4 className="text-sm font-semibold text-white mb-2"><CreditCard size={14} style={{ display: 'inline' }} /> Request Payment</h4>
                                                <p className="text-xs text-slate mb-2">Set the consultation fee and request payment from the patient before confirming the appointment.</p>
                                                <div className="fee-input-group">
                                                    <span className="text-sm text-white">₹</span>
                                                    <input
                                                        type="number"
                                                        className="fee-input"
                                                        placeholder={user?.consultationFee || '500'}
                                                        value={feeAmount}
                                                        onChange={e => setFeeAmount(e.target.value)}
                                                    />
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleRequestPayment(selected._id)} disabled={actionLoading}>
                                                        {actionLoading ? 'Sending...' : 'Request Payment'}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate mt-2">Leave blank to use your default fee (₹{user?.consultationFee || 500})</p>
                                            </div>
                                        )}

                                        {/* Payment Requested → Waiting for Patient */}
                                        {selected.status === 'payment_requested' && (
                                            <div className="payment-action-area">
                                                <div className="payment-amount-tag" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--orange-500)' }}>
                                                    <CreditCard size={14} /> ₹{selected.paymentAmount} — Awaiting Patient Payment
                                                </div>
                                                <p className="text-xs text-slate mt-2">Payment request sent. Waiting for the patient to complete the payment.</p>
                                            </div>
                                        )}

                                        {/* Paid → Confirm Appointment */}
                                        {selected.status === 'paid' && (
                                            <div className="payment-action-area">
                                                <div className="payment-amount-tag">
                                                    <CheckCircle size={14} /> ₹{selected.paymentAmount} Payment Received
                                                </div>
                                                <p className="text-xs text-slate mt-2 mb-4">Payment has been received from the patient. You can now confirm the appointment.</p>
                                                <button
                                                    className="btn btn-success btn-block"
                                                    onClick={() => handleConfirmAppointment(selected._id)}
                                                    disabled={actionLoading}
                                                >
                                                    <Check size={16} /> {actionLoading ? 'Confirming...' : 'Confirm Appointment'}
                                                </button>
                                            </div>
                                        )}

                                        {/* Confirmed */}
                                        {selected.status === 'confirmed' && (
                                            <div className="payment-action-area">
                                                <div className="payment-amount-tag" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--blue-400)' }}>
                                                    <CheckCircle size={14} /> Appointment Confirmed
                                                </div>
                                                <p className="text-xs text-slate mt-2">This appointment is confirmed and scheduled.</p>
                                            </div>
                                        )}

                                        {/* Patient ML Report (for confirmed/paid/completed) */}
                                        {selected.patientReport && (
                                            <div className="payment-action-area">
                                                <h4 className="text-sm font-semibold text-white mb-2"><FileText size={14} style={{ display: 'inline' }} /> Patient ML Report</h4>
                                                <div style={{ padding: '12px', background: 'rgba(37,99,235,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(37,99,235,0.12)', marginBottom: 12 }}>
                                                    <p className="text-sm" style={{
                                                        color: selected.patientReport.classification === 'Open Spina Bifida Detected' ? 'var(--red-400)' : 'var(--green-400)',
                                                        fontWeight: 600, marginBottom: 8
                                                    }}>
                                                        {selected.patientReport.classification === 'Open Spina Bifida Detected'
                                                            ? `OSB Detected — ${selected.patientReport.cnnPrediction === 'Severe OSB' ? 'Severe' : selected.patientReport.cnnPrediction === 'Moderate OSB' ? 'Moderate' : 'Mild'}`
                                                            : 'No OSB Detected'}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                                                        <div><span className="text-xs text-slate">BS:</span> <span className="text-sm font-semibold text-white">{selected.patientReport.bsValue}mm</span></div>
                                                        <div><span className="text-xs text-slate">BSOB:</span> <span className="text-sm font-semibold text-white">{selected.patientReport.bsobValue}mm</span></div>
                                                        <div><span className="text-xs text-slate">Ratio:</span> <span className="text-sm font-semibold text-white">{selected.patientReport.bsRatio}</span></div>
                                                    </div>
                                                    {selected.patientReport.recommendations?.length > 0 && (
                                                        <div>
                                                            <p className="text-xs text-slate" style={{ marginBottom: 4 }}>Clinical Actions:</p>
                                                            {selected.patientReport.recommendations.map((r, i) => (
                                                                <p key={i} className="text-xs" style={{ color: 'var(--teal-400)', padding: '2px 0' }}>→ {r}</p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {selected.patientReport.pdfUrl && (
                                                    <a href={`${backendOrigin}${selected.patientReport.pdfUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                                                        <Download size={14} /> View Full Report PDF
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {selected.doctorNotes && <div className="mt-4"><p className="text-xs text-teal"><strong>Your notes:</strong> {selected.doctorNotes}</p></div>}
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
