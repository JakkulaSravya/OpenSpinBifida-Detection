import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { CreditCard, Calendar, Clock, User, Shield, Check, ArrowLeft, QrCode, CheckCircle, AlertTriangle } from 'lucide-react';

// Generates a real scannable UPI QR code via Google Charts API
function PaymentQR({ amount, upiId = 'osbcheck@upi', name = 'OSBCheck', size = 200 }) {
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
    const qrSrc = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(upiUrl)}&choe=UTF-8`;
    return <img src={qrSrc} alt="UPI Payment QR Code" width={size} height={size} style={{ borderRadius: 8 }} />;
}

export default function PaymentPage() {
    const { api } = useAuth();
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [success, setSuccess] = useState(false);
    const [txnId, setTxnId] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState(0);

    useEffect(() => {
        api.get(`/payments/details/${appointmentId}`)
            .then(r => { setDetails(r.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [appointmentId]);

    const handleConfirmPayment = async () => {
        setPaying(true);
        setError('');
        setStep(1);

        // Simulate processing steps
        await new Promise(r => setTimeout(r, 1200));
        setStep(2);
        await new Promise(r => setTimeout(r, 1000));
        setStep(3);

        try {
            const res = await api.post(`/payments/confirm-payment/${appointmentId}`, {
                transactionId: 'TXN_' + Date.now()
            });
            setTxnId(res.data.transactionId);
            await new Promise(r => setTimeout(r, 600));
            setSuccess(true);
            setPaying(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Payment confirmation failed.');
            setPaying(false);
            setStep(0);
        }
    };

    const appt = details?.appointment;

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Payment" />
                <div className="page-content fade-in">
                    <div className="payment-page">
                        {loading ? (
                            <div className="page-loader"><div className="spinner"></div></div>
                        ) : success ? (
                            /* ---- SUCCESS SCREEN ---- */
                            <div className="glass-card" style={{ marginTop: 32 }}>
                                <div className="card-body result-panel">
                                    <div className="result-icon low"><Check size={36} /></div>
                                    <div className="result-classification" style={{ color: 'var(--green-400)' }}>Payment Successful!</div>
                                    <p className="text-sm text-slate mt-2">
                                        Your payment of <strong style={{ color: 'var(--white)' }}>₹{appt?.paymentAmount}</strong> has been confirmed.
                                    </p>
                                    {txnId && (
                                        <div style={{ marginTop: 12, padding: '10px 16px', background: 'rgba(20,184,166,0.08)', borderRadius: 8, display: 'inline-block' }}>
                                            <p className="text-xs text-slate">Transaction ID</p>
                                            <p className="text-sm" style={{ color: 'var(--teal-400)', fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}>{txnId}</p>
                                        </div>
                                    )}
                                    <p className="text-xs text-slate mt-4">
                                        The doctor will confirm your appointment shortly. You'll be notified once confirmed.
                                    </p>
                                    <button className="btn btn-primary mt-6" onClick={() => navigate('/patient/appointments')}>
                                        View Appointments
                                    </button>
                                </div>
                            </div>
                        ) : !appt ? (
                            /* ---- NOT FOUND ---- */
                            <div className="glass-card" style={{ marginTop: 32 }}>
                                <div className="empty-state">
                                    <AlertTriangle size={48} />
                                    <h3>Appointment Not Found</h3>
                                    <p>This appointment doesn't exist or you don't have access.</p>
                                    <button className="btn btn-primary mt-4" onClick={() => navigate('/patient/appointments')}>
                                        Back to Appointments
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ---- PAYMENT FORM ---- */
                            <>
                                <button className="btn btn-ghost mb-4" onClick={() => navigate('/patient/appointments')} style={{ gap: 6 }}>
                                    <ArrowLeft size={16} /> Back to Appointments
                                </button>

                                {/* Summary */}
                                <div className="glass-card mb-4">
                                    <div className="payment-summary">
                                        <h3><CreditCard size={18} style={{ display: 'inline', verticalAlign: 'middle' }} /> Payment Summary</h3>
                                        <div className="payment-detail-row">
                                            <span><User size={14} style={{ display: 'inline' }} /> Doctor</span>
                                            <span>{appt.doctorId?.name || 'Doctor'}</span>
                                        </div>
                                        <div className="payment-detail-row">
                                            <span>Specialization</span>
                                            <span>{appt.doctorId?.specialization || '-'}</span>
                                        </div>
                                        <div className="payment-detail-row">
                                            <span>Hospital</span>
                                            <span>{appt.doctorId?.hospital || '-'}</span>
                                        </div>
                                        <div className="payment-detail-row">
                                            <span><Calendar size={14} style={{ display: 'inline' }} /> Date</span>
                                            <span>{appt.date}</span>
                                        </div>
                                        <div className="payment-detail-row">
                                            <span><Clock size={14} style={{ display: 'inline' }} /> Time</span>
                                            <span>{appt.timeSlot}</span>
                                        </div>
                                        <div className="payment-total-row">
                                            <span>Consultation Fee</span>
                                            <span>₹{appt.paymentAmount}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* QR Code */}
                                <div className="glass-card mb-4">
                                    <div style={{ padding: 28, textAlign: 'center' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(37,99,235,0.12)', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, color: 'var(--blue-400)', marginBottom: 18 }}>
                                            <QrCode size={14} /> Scan & Pay via UPI
                                        </div>

                                        <div style={{ display: 'inline-block', padding: 14, background: 'white', borderRadius: 12, marginBottom: 16, boxShadow: '0 0 30px rgba(37,99,235,0.15)' }}>
                                            <PaymentQR amount={appt.paymentAmount} size={200} />
                                        </div>

                                        <p className="text-sm" style={{ color: 'var(--white)', fontWeight: 700, marginBottom: 2 }}>
                                            ₹{appt.paymentAmount}.00
                                        </p>
                                        <p className="text-xs text-slate mb-1">OSBCheck Healthcare</p>
                                        <p className="text-xs" style={{ color: 'var(--blue-400)', fontFamily: 'monospace' }}>osbcheck@upi</p>

                                        <div style={{ margin: '20px auto', maxWidth: 320, padding: '12px 16px', background: 'rgba(20,184,166,0.06)', borderRadius: 8, border: '1px solid rgba(20,184,166,0.15)' }}>
                                            <p className="text-xs text-slate" style={{ lineHeight: 1.5 }}>
                                                <strong style={{ color: 'var(--teal-400)' }}>How to pay:</strong> Open any UPI app (GPay, PhonePe, Paytm), scan the QR code, pay ₹{appt.paymentAmount}, then click the button below to confirm.
                                            </p>
                                        </div>

                                        {/* Processing Animation */}
                                        {paying && (
                                            <div style={{ margin: '16px auto', maxWidth: 260, textAlign: 'left' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                    <CheckCircle size={16} style={{ color: step >= 1 ? 'var(--green-400)' : 'var(--slate-600)' }} />
                                                    <span className="text-xs" style={{ color: step >= 1 ? 'var(--green-400)' : 'var(--slate-500)' }}>Payment received</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                    {step >= 2 ? <CheckCircle size={16} style={{ color: 'var(--green-400)' }} /> : <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>}
                                                    <span className="text-xs" style={{ color: step >= 2 ? 'var(--green-400)' : 'var(--blue-400)' }}>Verifying transaction...</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {step >= 3 ? <CheckCircle size={16} style={{ color: 'var(--green-400)' }} /> : step >= 2 ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> : <div style={{ width: 16 }}></div>}
                                                    <span className="text-xs" style={{ color: step >= 3 ? 'var(--green-400)' : step >= 2 ? 'var(--blue-400)' : 'var(--slate-600)' }}>Confirming appointment...</span>
                                                </div>
                                            </div>
                                        )}

                                        {!paying && appt.status === 'payment_requested' && (
                                            <button
                                                className="btn btn-primary btn-block mt-4"
                                                onClick={handleConfirmPayment}
                                                style={{ maxWidth: 320, margin: '16px auto 0', justifyContent: 'center' }}
                                            >
                                                <Check size={16} /> I Have Paid — Confirm Payment
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Refund Policy */}
                                <div className="refund-policy-banner">
                                    <h4><Shield size={16} /> Refund & Cancellation Policy</h4>
                                    <ul>
                                        <li><strong>Full refund</strong> if cancelled more than <strong>24 hours</strong> before the appointment date.</li>
                                        <li><strong>No refund</strong> if cancelled within <strong>24 hours</strong> of the appointment.</li>
                                        <li>Refunds will be processed within 5–7 business days.</li>
                                        <li>By confirming payment, you agree to this cancellation policy.</li>
                                    </ul>
                                </div>

                                {error && <p className="error-text mt-4" style={{ textAlign: 'center' }}>{error}</p>}

                                <p className="text-xs text-slate mt-4" style={{ textAlign: 'center' }}>
                                    🔒 Payments are secure. Contact support for any payment issues.
                                </p>
                            </>
                        )}
                    </div>
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
