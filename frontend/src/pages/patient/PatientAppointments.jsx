import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { Clock, Calendar, CreditCard, AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';

const STATUS_LABELS = {
    pending: 'Pending Review',
    accepted: 'Accepted',
    rejected: 'Rejected',
    payment_requested: 'Payment Required',
    paid: 'Payment Done — Awaiting Confirmation',
    confirmed: 'Confirmed ✅',
    completed: 'Completed',
    cancelled: 'Cancelled'
};

export default function PatientAppointments() {
    const { api } = useAuth();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refunding, setRefunding] = useState(null);

    useEffect(() => {
        api.get('/patient/appointments').then(r => { setAppointments(r.data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const handleRefund = async (apptId) => {
        if (!window.confirm('Are you sure you want to cancel this appointment and request a refund? Full refund is only available if cancelled more than 24 hours before the appointment.')) return;
        setRefunding(apptId);
        try {
            await api.post(`/payments/refund/${apptId}`);
            alert('Refund processed successfully. Your appointment has been cancelled.');
            const r = await api.get('/patient/appointments');
            setAppointments(r.data);
        } catch (err) {
            alert(err.response?.data?.error || 'Refund request failed.');
        }
        setRefunding(null);
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="My Appointments" />
                <div className="page-content fade-in">
                    <div className="page-header">
                        <h1>Appointments</h1>
                        <p>Track your consultation requests, payments, and upcoming sessions</p>
                    </div>

                    {loading ? <div className="page-loader"><div className="spinner"></div></div> : appointments.length === 0 ? (
                        <div className="glass-card"><div className="empty-state"><Calendar size={48} /><h3>No Appointments</h3><p>Book your first consultation with a specialist.</p></div></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {appointments.map(appt => (
                                <div key={appt._id} className="glass-card" style={{ padding: 20 }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-white">{appt.doctorId?.name || 'Doctor'}</p>
                                            <p className="text-xs text-slate">{appt.doctorId?.specialization} — {appt.doctorId?.hospital}</p>
                                        </div>
                                        <span className={`status-badge ${appt.status}`}>
                                            {STATUS_LABELS[appt.status] || appt.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate mt-2">
                                        <span className="flex items-center gap-1"><Calendar size={12} />{appt.date}</span>
                                        <span className="flex items-center gap-1"><Clock size={12} />{appt.timeSlot}</span>
                                    </div>
                                    {appt.doctorNotes && <p className="text-xs mt-2" style={{ color: 'var(--teal-400)' }}>Doctor's Note: {appt.doctorNotes}</p>}

                                    {/* Payment Required */}
                                    {appt.status === 'payment_requested' && (
                                        <div className="payment-action-area">
                                            <div className="payment-amount-tag">
                                                <CreditCard size={14} /> ₹{appt.paymentAmount} Consultation Fee
                                            </div>

                                            <div className="refund-policy-banner" style={{ marginTop: 10, marginBottom: 12 }}>
                                                <h4><Shield size={14} /> Refund Policy</h4>
                                                <ul>
                                                    <li><strong>Full refund</strong> if cancelled 24+ hours before the appointment</li>
                                                    <li><strong>No refund</strong> within 24 hours of the appointment</li>
                                                </ul>
                                            </div>

                                            <button
                                                className="razorpay-btn"
                                                onClick={() => navigate(`/patient/payment/${appt._id}`)}
                                            >
                                                <CreditCard size={16} /> Pay Now — ₹{appt.paymentAmount}
                                            </button>
                                        </div>
                                    )}

                                    {/* Payment Done */}
                                    {appt.status === 'paid' && (
                                        <div className="payment-action-area">
                                            <div className="flex items-center gap-3">
                                                <span className="payment-amount-tag">
                                                    <CheckCircle size={14} /> ₹{appt.paymentAmount} Paid
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate mt-2">Payment completed. Waiting for doctor to confirm your appointment.</p>
                                            <button
                                                className="btn btn-danger btn-sm mt-4"
                                                onClick={() => handleRefund(appt._id)}
                                                disabled={refunding === appt._id}
                                            >
                                                {refunding === appt._id ? 'Processing...' : 'Cancel & Request Refund'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Confirmed */}
                                    {appt.status === 'confirmed' && (
                                        <div className="payment-action-area">
                                            <div className="flex items-center gap-3">
                                                <span className="payment-amount-tag" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--blue-400)' }}>
                                                    <CheckCircle size={14} /> Appointment Confirmed
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate mt-2">Your appointment is confirmed. Please be available at the scheduled time.</p>
                                        </div>
                                    )}

                                    {/* Cancelled/Refunded */}
                                    {appt.status === 'cancelled' && (
                                        <div className="payment-action-area">
                                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--red-400)' }}>
                                                <XCircle size={14} /> This appointment was cancelled.
                                                {appt.paymentStatus === 'refunded' && ' Refund has been processed.'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
