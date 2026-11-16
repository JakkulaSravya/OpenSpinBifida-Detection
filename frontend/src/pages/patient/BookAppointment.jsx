import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { Calendar, Clock, Check, AlertTriangle } from 'lucide-react';

export default function BookAppointment() {
    const { api } = useAuth();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [appForm, setAppForm] = useState({ pregnancyHistory: '', symptoms: '', previousReports: '', consentAI: false, medicalRecords: '', additionalNotes: '' });
    const [loading, setLoading] = useState(false);
    const [slotsLoading, setSlotsLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const stored = sessionStorage.getItem('booking_doctor');
        if (stored) {
            const doc = JSON.parse(stored);
            setDoctor(doc);
            // Fetch doctor's real available slots
            api.get(`/patient/doctor-slots/${doc._id}`).then(r => {
                setAvailableSlots(r.data);
                setSlotsLoading(false);
            }).catch(() => setSlotsLoading(false));
        } else {
            navigate('/patient/doctors');
        }
    }, []);

    // Group available slots by date
    const slotsByDate = {};
    availableSlots.forEach(s => {
        if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
        slotsByDate[s.date].push(s.time);
    });

    // Available dates (sorted)
    const availableDates = Object.keys(slotsByDate).sort();

    // Times for selected date
    const timesForDate = selectedDate ? (slotsByDate[selectedDate] || []) : [];

    const handleBook = async () => {
        if (!selectedDate || !selectedTime) return;
        setLoading(true);
        setError('');
        try {
            await api.post('/patient/book-appointment', {
                doctorId: doctor._id,
                date: selectedDate,
                timeSlot: selectedTime,
                applicationForm: appForm
            });
            setSuccess(true);
        } catch (err) {
            const msg = err.response?.data?.error || 'Booking failed';
            if (err.response?.status === 409) {
                setError(msg);
                // Refresh available slots
                api.get(`/patient/doctor-slots/${doctor._id}`).then(r => {
                    setAvailableSlots(r.data);
                    setSelectedTime('');
                }).catch(() => {});
            } else {
                setError(msg);
            }
        }
        setLoading(false);
    };

    if (!doctor) return null;

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Book Appointment" />
                <div className="page-content fade-in">
                    {success ? (
                        <div className="glass-card" style={{ maxWidth: 500, margin: '60px auto' }}>
                            <div className="card-body result-panel">
                                <div className="result-icon low"><Check size={36} /></div>
                                <div className="result-classification" style={{ color: 'var(--green-400)' }}>Booking Confirmed!</div>
                                <p className="text-sm text-slate mt-2">Your consultation request with {doctor.name} has been submitted for {selectedDate} at {selectedTime}.</p>
                                <p className="text-xs text-slate mt-2">You'll be notified when the doctor accepts your request.</p>
                                <button className="btn btn-primary mt-6" onClick={() => navigate('/patient/appointments')}>View Appointments</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="page-header">
                                <h1>Book with {doctor.name}</h1>
                                <p>{doctor.specialization} — {doctor.hospital}</p>
                            </div>

                            {error && (
                                <div className="glass-card mb-4" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                                    <div className="card-body flex items-center gap-3">
                                        <AlertTriangle size={20} color="var(--red-400)" />
                                        <p className="text-sm" style={{ color: 'var(--red-400)' }}>{error}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid-2">
                                <div>
                                    <div className="glass-card mb-4">
                                        <div className="card-header"><h3><Calendar size={16} /> Select Date</h3></div>
                                        <div className="card-body">
                                            {slotsLoading ? (
                                                <div className="page-loader"><div className="spinner"></div></div>
                                            ) : availableDates.length === 0 ? (
                                                <div className="empty-state" style={{ padding: 20 }}>
                                                    <Calendar size={28} />
                                                    <p className="text-xs">No available slots. The doctor hasn't added any open time slots yet.</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10 }}>
                                                    {availableDates.map(d => {
                                                        const day = new Date(d + 'T00:00:00');
                                                        const isSelected = selectedDate === d;
                                                        return (
                                                            <div key={d} onClick={() => { setSelectedDate(d); setSelectedTime(''); }}
                                                                style={{
                                                                    textAlign: 'center', padding: '12px 8px', cursor: 'pointer',
                                                                    borderRadius: 'var(--radius-md)',
                                                                    border: isSelected ? '2px solid var(--blue-500)' : '1px solid rgba(0,0,0,0.08)',
                                                                    background: isSelected ? 'rgba(37,99,235,0.08)' : 'var(--surface)',
                                                                    transition: 'all 0.15s ease'
                                                                }}>
                                                                <div style={{ fontSize: '0.65rem', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                                                                    {day.toLocaleDateString('en', { weekday: 'short' })}
                                                                </div>
                                                                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: isSelected ? 'var(--blue-500)' : 'var(--text-primary)', lineHeight: 1.2 }}>
                                                                    {day.getDate()}
                                                                </div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)', marginBottom: 4 }}>
                                                                    {day.toLocaleDateString('en', { month: 'short' })}
                                                                </div>
                                                                <div style={{ fontSize: '0.65rem', color: 'var(--teal-400)', fontWeight: 600 }}>
                                                                    {slotsByDate[d].length} slot{slotsByDate[d].length !== 1 ? 's' : ''}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {selectedDate && (
                                        <div className="glass-card slide-up">
                                            <div className="card-header"><h3><Clock size={16} /> Select Time — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</h3></div>
                                            <div className="card-body">
                                                {timesForDate.length === 0 ? (
                                                    <p className="text-sm text-slate">No available time slots for this date.</p>
                                                ) : (
                                                    <div className="time-slots">
                                                        {timesForDate.map(t => (
                                                            <div key={t} className={`time-slot ${selectedTime === t ? 'selected' : ''}`} onClick={() => setSelectedTime(t)}>
                                                                {t}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="glass-card">
                                    <div className="card-header"><h3>📋 Medical Application Form</h3></div>
                                    <div className="card-body">
                                        <div className="form-group">
                                            <label>Pregnancy History</label>
                                            <textarea className="form-textarea" placeholder="Previous pregnancies, complications..." value={appForm.pregnancyHistory} onChange={e => setAppForm(p => ({ ...p, pregnancyHistory: e.target.value }))} />
                                        </div>
                                        <div className="form-group">
                                            <label>Current Symptoms</label>
                                            <textarea className="form-textarea" placeholder="Any concerns or symptoms..." value={appForm.symptoms} onChange={e => setAppForm(p => ({ ...p, symptoms: e.target.value }))} />
                                        </div>
                                        <div className="form-group">
                                            <label>Previous Medical Reports</label>
                                            <textarea className="form-textarea" placeholder="Summary of report findings..." value={appForm.previousReports} onChange={e => setAppForm(p => ({ ...p, previousReports: e.target.value }))} />
                                        </div>
                                        <div className="form-group">
                                            <label>Additional Notes</label>
                                            <textarea className="form-textarea" placeholder="Anything else to share..." value={appForm.additionalNotes} onChange={e => setAppForm(p => ({ ...p, additionalNotes: e.target.value }))} style={{ minHeight: 60 }} />
                                        </div>
                                        <label className="form-checkbox mb-4">
                                            <input type="checkbox" checked={appForm.consentAI} onChange={e => setAppForm(p => ({ ...p, consentAI: e.target.checked }))} />
                                            I consent to share ML analysis data with the doctor
                                        </label>

                                        <button className="btn btn-primary btn-block" onClick={handleBook} disabled={!selectedDate || !selectedTime || loading}>
                                            {loading ? 'Submitting...' : 'Confirm Booking'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
