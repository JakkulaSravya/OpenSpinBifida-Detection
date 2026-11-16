import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { User, Bell, Shield, Save } from 'lucide-react';

export default function DoctorSettings() {
    const { user, api } = useAuth();
    const [form, setForm] = useState({ name: '', phone: '', specialization: '', hospital: '', experience: '', consultationFee: '' });
    const [notifs, setNotifs] = useState({ email: true, sms: false, inApp: true });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({ name: user.name || '', phone: user.phone || '', specialization: user.specialization || '', hospital: user.hospital || '', experience: user.experience || '', consultationFee: user.consultationFee || '' });
        }
    }, [user]);

    const handleSave = async () => {
        try {
            await api.put('/doctor/settings', { ...form, experience: Number(form.experience), consultationFee: Number(form.consultationFee), notificationPrefs: notifs });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch { }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Settings" />
                <div className="page-content fade-in">
                    <div className="page-header"><h1>Account Settings</h1><p>Manage your professional profile and preferences</p></div>

                    <div style={{ maxWidth: 700 }}>
                        <div className="glass-card mb-6">
                            <div className="card-header"><h3><User size={16} /> Professional Profile</h3></div>
                            <div className="card-body">
                                <div className="form-row">
                                    <div className="form-group"><label>Full Name</label><input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                                    <div className="form-group"><label>Phone</label><input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>Specialization</label><input className="form-input" value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} /></div>
                                    <div className="form-group"><label>Hospital</label><input className="form-input" value={form.hospital} onChange={e => setForm(p => ({ ...p, hospital: e.target.value }))} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>Years of Experience</label><input className="form-input" type="number" value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} /></div>
                                    <div className="form-group"><label>Consultation Fee (₹)</label><input className="form-input" type="number" value={form.consultationFee} onChange={e => setForm(p => ({ ...p, consultationFee: e.target.value }))} /></div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card mb-6">
                            <div className="card-header"><h3><Shield size={16} /> Privacy & Compliance</h3></div>
                            <div className="card-body">
                                <div className="settings-row"><div className="settings-row-info"><h4>HIPAA Compliance Mode</h4><p>Enable enhanced data encryption for patient records</p></div><label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label></div>
                                <div className="settings-row"><div className="settings-row-info"><h4>Anonymous Case Export</h4><p>Allow exporting case data with anonymized patient info</p></div><label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label></div>
                            </div>
                        </div>

                        <button className="btn btn-primary btn-lg" onClick={handleSave}>
                            <Save size={16} /> {saved ? '✓ Saved!' : 'Save Settings'}
                        </button>
                    </div>
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
