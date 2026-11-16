import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { Send, MessageSquare, Calendar, Clock } from 'lucide-react';

export default function PatientMessages() {
    const { user, api } = useAuth();
    const [doctors, setDoctors] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const chatRef = useRef(null);

    useEffect(() => {
        api.get('/patient/appointments').then(r => {
            const messageable = r.data.filter(a => ['accepted', 'confirmed', 'paid', 'completed'].includes(a.status));

            // Deduplicate by doctor ID — group all appointments per doctor
            const doctorMap = {};
            messageable.forEach(a => {
                const did = a.doctorId?._id || a.doctorId;
                if (!doctorMap[did]) {
                    doctorMap[did] = { ...a, appointments: [a] };
                } else {
                    doctorMap[did].appointments.push(a);
                }
            });

            setDoctors(Object.values(doctorMap));
        }).catch(() => { });
    }, []);

    const loadMessages = async (doctorId) => {
        setLoading(true);
        try {
            const res = await api.get(`/messages/${doctorId}`);
            setMessages(res.data);
        } catch { }
        setLoading(false);
    };

    useEffect(() => {
        if (activeChat) {
            const did = activeChat.doctorId?._id || activeChat.doctorId;
            loadMessages(did);
            const interval = setInterval(() => loadMessages(did), 8000);
            return () => clearInterval(interval);
        }
    }, [activeChat]);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages]);

    const sendMessage = async () => {
        if (!newMsg.trim() || !activeChat) return;
        const did = activeChat.doctorId?._id || activeChat.doctorId;
        try {
            await api.post('/messages/send', {
                receiverId: did,
                appointmentId: activeChat._id,
                content: newMsg,
                type: 'text'
            });
            setNewMsg('');
            loadMessages(did);
        } catch { }
    };

    // Confirmed appointments for active chat
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
                        {/* Contact List — deduplicated by doctor */}
                        <div style={{ width: 300, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <h3 className="text-sm font-semibold text-white">Consultations</h3>
                            </div>
                            {doctors.length === 0 ? (
                                <div className="empty-state" style={{ padding: 30 }}><MessageSquare size={28} /><p className="text-xs">No active consultations</p></div>
                            ) : doctors.map(doc => {
                                const did = doc.doctorId?._id || doc.doctorId;
                                const activeDid = activeChat?.doctorId?._id || activeChat?.doctorId;
                                const isActive = did === activeDid;
                                return (
                                    <div key={did} onClick={() => setActiveChat(doc)}
                                        style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', background: isActive ? 'rgba(37,99,235,0.08)' : 'transparent' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="doctor-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>{(doc.doctorId?.name || 'D').charAt(0)}</div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{doc.doctorId?.name || 'Doctor'}</p>
                                                <p className="text-xs text-slate">{doc.doctorId?.specialization}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Chat Area */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {activeChat ? (
                                <>
                                    <div className="chat-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: '12px 20px' }}>
                                        <div className="flex items-center gap-3" style={{ marginBottom: confirmedAppointments.length > 0 ? 10 : 0 }}>
                                            <div className="doctor-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>{(activeChat.doctorId?.name || 'D').charAt(0)}</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-white">{activeChat.doctorId?.name}</p>
                                                <p className="text-xs text-slate">{activeChat.doctorId?.specialization}</p>
                                            </div>
                                        </div>

                                        {/* Appointment Calendar Cards */}
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
                                <div className="empty-state" style={{ margin: 'auto' }}>
                                    <MessageSquare size={48} />
                                    <h3>Select a Consultation</h3>
                                    <p>Choose a consultation from the left to start messaging</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
