import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { Plus, Trash2, Calendar, Clock, User } from 'lucide-react';

// Generate time options from 9 AM to 7 PM in 30-min increments
const generateTimeOptions = () => {
    const times = [];
    for (let h = 9; h <= 19; h++) {
        const hour12 = h > 12 ? h - 12 : h;
        const ampm = h >= 12 ? 'PM' : 'AM';
        times.push(`${String(hour12).padStart(2, '0')}:00 ${ampm}`);
        if (h < 19) times.push(`${String(hour12).padStart(2, '0')}:30 ${ampm}`);
    }
    return times;
};

const ALL_TIMES = generateTimeOptions();

const DURATION_OPTIONS = [
    { value: 15, label: '15 min' },
    { value: 20, label: '20 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '60 min' },
];

const STATUS_LABELS = {
    pending: 'Pending',
    accepted: 'Accepted',
    payment_requested: 'Payment Req.',
    paid: 'Paid',
    confirmed: 'Confirmed',
    completed: 'Completed'
};

// Convert "HH:MM AM/PM" to minutes from midnight
function timeToMinutes(t) {
    const [timePart, ampm] = t.split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
}

// Convert minutes from midnight to "HH:MM AM/PM"
function minutesToTime(mins) {
    let h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function ScheduleManagement() {
    const { api } = useAuth();
    const [slots, setSlots] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Session form state
    const [sessions, setSessions] = useState([
        { date: '', startTime: '09:00 AM', endTime: '01:00 PM', duration: 30 }
    ]);

    const load = () => {
        api.get('/doctor/schedule').then(r => {
            setSlots(r.data.slots || []);
            setAppointments(r.data.appointments || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };
    useEffect(load, []);

    const updateSession = (index, field, value) => {
        setSessions(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    };

    const addSession = () => {
        setSessions(prev => [...prev, { date: prev[0]?.date || '', startTime: '02:00 PM', endTime: '07:00 PM', duration: 30 }]);
    };

    const removeSession = (index) => {
        if (sessions.length <= 1) return;
        setSessions(prev => prev.filter((_, i) => i !== index));
    };

    const generateSlots = async () => {
        const allSlots = [];
        sessions.forEach(session => {
            if (!session.date || !session.startTime || !session.endTime) return;
            const startMins = timeToMinutes(session.startTime);
            const endMins = timeToMinutes(session.endTime);
            for (let m = startMins; m + session.duration <= endMins; m += session.duration) {
                allSlots.push({ date: session.date, time: minutesToTime(m) });
            }
        });

        if (allSlots.length === 0) return;

        try {
            await api.post('/doctor/schedule', { slots: allSlots });
            load();
            setSessions([{ date: '', startTime: '09:00 AM', endTime: '01:00 PM', duration: 30 }]);
        } catch { }
    };

    const removeSlot = async (date, time) => {
        try {
            await api.delete(`/doctor/schedule/${date}/${encodeURIComponent(time)}`);
            load();
        } catch { }
    };

    // Group slots by date
    const grouped = {};
    slots.forEach(s => {
        if (!grouped[s.date]) grouped[s.date] = [];
        grouped[s.date].push(s);
    });

    const appointmentDates = new Set(appointments.map(a => a.date));

    // Filter end times to only show times after start time
    const getEndTimes = (startTime) => {
        const startMins = timeToMinutes(startTime);
        return ALL_TIMES.filter(t => timeToMinutes(t) > startMins);
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Schedule Management" />
                <div className="page-content fade-in">
                    <div className="page-header"><h1>Manage Schedule</h1><p>Add sessions and manage consultation time slots</p></div>

                    <div className="grid-2">
                        <div>
                            {/* Session-based slot creation */}
                            <div className="glass-card mb-4">
                                <div className="card-header"><h3><Plus size={16} /> Add Consultation Slots</h3></div>
                                <div className="card-body">
                                    {sessions.map((session, idx) => (
                                        <div key={idx} style={{
                                            padding: 16,
                                            background: 'rgba(37,99,235,0.03)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid rgba(37,99,235,0.1)',
                                            marginBottom: idx < sessions.length - 1 ? 12 : 0
                                        }}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold" style={{ color: 'var(--blue-400)' }}>
                                                    {idx === 0 ? '🌅 Session 1' : `☀️ Session ${idx + 1}`}
                                                </span>
                                                {sessions.length > 1 && (
                                                    <button style={{ background: 'none', border: 'none', color: 'var(--red-400)', cursor: 'pointer', padding: 2 }}
                                                        onClick={() => removeSession(idx)}><Trash2 size={14} /></button>
                                                )}
                                            </div>
                                            <div className="form-group">
                                                <label>Date</label>
                                                <input className="form-input" type="date" value={session.date}
                                                    onChange={e => updateSession(idx, 'date', e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                <div className="form-group">
                                                    <label>Start Time</label>
                                                    <select className="form-select" value={session.startTime}
                                                        onChange={e => updateSession(idx, 'startTime', e.target.value)}>
                                                        {ALL_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>End Time</label>
                                                    <select className="form-select" value={session.endTime}
                                                        onChange={e => updateSession(idx, 'endTime', e.target.value)}>
                                                        {getEndTimes(session.startTime).map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Slot Duration</label>
                                                <select className="form-select" value={session.duration}
                                                    onChange={e => updateSession(idx, 'duration', Number(e.target.value))}>
                                                    {DURATION_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ))}

                                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                                        <button className="btn btn-secondary" onClick={addSession} style={{ flex: 1 }}>
                                            <Plus size={14} /> Add Session
                                        </button>
                                    </div>
                                    <button className="btn btn-primary btn-block mt-4" onClick={generateSlots}
                                        disabled={sessions.every(s => !s.date)}>
                                        <Calendar size={16} /> Generate Slots
                                    </button>
                                </div>
                            </div>

                            {/* Booked consultations */}
                            <div className="glass-card">
                                <div className="card-header"><h3><Calendar size={16} /> Booked Consultations ({appointments.length})</h3></div>
                                <div className="card-body">
                                    {appointments.length === 0 ? (
                                        <p className="text-sm text-slate">No booked consultations yet.</p>
                                    ) : appointments.map(a => (
                                        <div key={a._id} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <div className="flex items-center gap-3">
                                                <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', background: 'linear-gradient(135deg, #14b8a6, #2563eb)' }}>
                                                    {(a.patientId?.name || 'P').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{a.patientId?.name || 'Patient'}</p>
                                                    <p className="text-xs text-slate">{a.date} — {a.timeSlot}</p>
                                                </div>
                                            </div>
                                            <span className={`status-badge ${a.status}`}>
                                                {STATUS_LABELS[a.status] || a.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Available slots panel */}
                        <div className="glass-card">
                            <div className="card-header"><h3><Clock size={16} /> Available Slots</h3></div>
                            <div className="card-body">
                                {Object.keys(grouped).length === 0 ? (
                                    <div className="empty-state" style={{ padding: 30 }}><Calendar size={36} /><p className="text-xs">No available slots. Add sessions above to generate slots.</p></div>
                                ) : Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, dateSlots]) => {
                                    const hasAppt = appointmentDates.has(date);
                                    return (
                                        <div key={date} className="mb-4">
                                            <h4 className="text-sm font-semibold mb-2" style={{
                                                color: hasAppt ? 'var(--blue-400)' : 'var(--text-primary)',
                                                display: 'flex', alignItems: 'center', gap: 6
                                            }}>
                                                {hasAppt && <Calendar size={12} />}
                                                {new Date(date + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                {hasAppt && <span className="text-xs" style={{ color: 'var(--blue-400)', fontWeight: 400 }}>(has appointments)</span>}
                                            </h4>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {dateSlots.map((s, i) => (
                                                    <div key={i} className="flex items-center gap-2" style={{
                                                        padding: '6px 12px',
                                                        background: s.booked ? 'rgba(239,68,68,0.1)' : 'var(--navy-700)',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: `1px solid ${s.booked ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`
                                                    }}>
                                                        <span className="text-xs" style={{ color: s.booked ? 'var(--red-400)' : 'var(--slate-300)' }}>{s.time}</span>
                                                        {!s.booked && <button style={{ background: 'none', color: 'var(--red-400)', padding: 0, border: 'none', cursor: 'pointer' }} onClick={() => removeSlot(date, s.time)}><Trash2 size={12} /></button>}
                                                        {s.booked && <span className="text-xs" style={{ color: 'var(--red-400)', fontWeight: 600 }}>Booked</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
