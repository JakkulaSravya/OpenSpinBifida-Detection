import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { Send, MessageSquare, Calendar, Clock } from 'lucide-react';

export default function DoctorMessages() {
    const { user, api } = useAuth();
    const [consultations, setConsultations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState('');
    const chatRef = useRef(null);

    useEffect(() => {
        api.get('/doctor/consultations').then(r => {
            const messageable = r.data.filter(c => ['accepted', 'confirmed', 'paid', 'completed'].includes(c.status));

            // Deduplicate by patient ID — group all appointments per patient into one entry
            const patientMap = {};
            messageable.forEach(c => {
                const pid = c.patientId?._id || c.patientId;
                if (!patientMap[pid]) {
                    patientMap[pid] = {
                        ...c,
                        appointments: [c] // store all appointments for this patient
                    };
                } else {
                    patientMap[pid].appointments.push(c);
                }
            });

            setConsultations(Object.values(patientMap));
        }).catch(() => { });
    }, []);

    const loadMessages = async (patientId) => {
        try {
            const res = await api.get(`/messages/${patientId}`);
            setMessages(res.data);
        } catch { }
    };

    useEffect(() => {
        if (activeChat) {
            const pid = activeChat.patientId?._id || activeChat.patientId;
            loadMessages(pid);
            const interval = setInterval(() => loadMessages(pid), 8000);
            return () => clearInterval(interval);
        }
    }, [activeChat]);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages]);

    const sendMessage = async () => {
        if (!newMsg.trim() || !activeChat) return;
        const pid = activeChat.patientId?._id || activeChat.patientId;
        try {
            await api.post('/messages/send', { receiverId: pid, appointmentId: activeChat._id, content: newMsg, type: 'text' });
            setNewMsg('');
            loadMessages(pid);
        } catch { }
    };

    // Get confirmed appointments for active chat's patient
    const confirmedAppointments = activeChat?.appointments?.filter(a =>
        ['confirmed', 'accepted', 'paid'].includes(a.status)
    ) || [];

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Messages" />
                <div className="page-content" style={{ padding: 0 }}>
                    <div style={{ display: 'flex', height: 'calc(100vh - 130px)' }}>
                        {/* Contact List — deduplicated */}
                        <div style={{ width: 300, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <h3 className="text-sm font-semibold text-white">Patients</h3>
                            </div>
                            {consultations.map(c => {
                                const pid = c.patientId?._id || c.patientId;
                                const activePid = activeChat?.patientId?._id || activeChat?.patientId;
                                const isActive = pid === activePid;
                                const apptCount = c.appointments?.length || 1;
                                return (
                                    <div key={pid} onClick={() => setActiveChat(c)}
                                        style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', background: isActive ? 'rgba(37,99,235,0.08)' : 'transparent' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>{(c.patientId?.name || 'P').charAt(0)}</div>
                                            <div style={{ flex: 1 }}>
                                                <p className="text-sm font-semibold text-white">{c.patientId?.name || 'Patient'}</p>
                                                <p className="text-xs text-slate">
                                                    {apptCount > 1 ? `${apptCount} appointments` : c.date}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {consultations.length === 0 && <div className="empty-state" style={{ padding: 30 }}><MessageSquare size={28} /><p className="text-xs">No active consultations</p></div>}
                        </div>

                        {/* Chat Area */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {activeChat ? (
                                <>
                                    {/* Header with patient info */}
                                    <div className="chat-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: '12px 20px' }}>
                                        <div className="flex items-center gap-3" style={{ marginBottom: confirmedAppointments.length > 0 ? 10 : 0 }}>
                                            <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>{(activeChat.patientId?.name || 'P').charAt(0)}</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-white">{activeChat.patientId?.name}</p>
                                                <p className="text-xs text-slate">Gestational Age: {activeChat.patientId?.gestationalAge} weeks</p>
                                            </div>
                                        </div>

                                        {/* Confirmed Appointments Mini Calendar */}
                                        {confirmedAppointments.length > 0 && (
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {confirmedAppointments.map((appt, i) => {
                                                    const d = new Date(appt.date + 'T00:00:00');
                                                    return (
                                                        <div key={i} style={{
                                                            display: 'flex', alignItems: 'center', gap: 8,
                                                            padding: '6px 12px',
                                                            background: 'rgba(37,99,235,0.08)',
                                                            border: '1px solid rgba(37,99,235,0.2)',
                                                            borderRadius: 'var(--radius-md)'
                                                        }}>
                                                            <div style={{ textAlign: 'center', lineHeight: 1 }}>
                                                                <div style={{ fontSize: '0.6rem', color: 'var(--blue-400)', fontWeight: 700, textTransform: 'uppercase' }}>
                                                                    {d.toLocaleDateString('en', { month: 'short' })}
                                                                </div>
                                                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--blue-400)' }}>
                                                                    {d.getDate()}
                                                                </div>
                                                                <div style={{ fontSize: '0.55rem', color: 'var(--slate-400)' }}>
                                                                    {d.toLocaleDateString('en', { weekday: 'short' })}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-semibold" style={{ color: 'var(--blue-400)' }}>
                                                                    <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                                                                    {appt.timeSlot}
                                                                </div>
                                                                <div style={{ fontSize: '0.6rem', color: appt.status === 'confirmed' ? 'var(--green-400)' : 'var(--slate-400)' }}>
                                                                    {appt.status === 'confirmed' ? '✓ Confirmed' : appt.status === 'paid' ? '💰 Paid' : 'Accepted'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="chat-messages" ref={chatRef}>
                                        {messages.map(msg => (
                                            <div key={msg._id} className={`chat-bubble ${msg.senderId === user.id ? 'sent' : 'received'}`}>
                                                {msg.content}
                                                <div className="chat-bubble-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="chat-input-bar">
                                        <input className="chat-input" placeholder="Type a message..." value={newMsg} onChange={e => setNewMsg(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                                        <button className="chat-send-btn" onClick={sendMessage}><Send size={18} /></button>
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state" style={{ margin: 'auto' }}><MessageSquare size={48} /><h3>Select a Patient</h3><p>Choose a consultation to start messaging</p></div>
                            )}
                        </div>
                    </div>
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
