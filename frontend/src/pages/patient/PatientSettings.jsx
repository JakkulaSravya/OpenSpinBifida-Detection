import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { User, Lock, Bell, Shield, Save } from 'lucide-react';

export default function PatientSettings() {
    const { user, api } = useAuth();
    const [form, setForm] = useState({ name: '', phone: '', age: '', gestationalAge: '', trimester: '' });
    const [notifs, setNotifs] = useState({ email: true, sms: false, inApp: true });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({ name: user.name || '', phone: user.phone || '', age: user.age || '', gestationalAge: user.gestationalAge || '', trimester: user.trimester || '' });
        }
    }, [user]);

    const handleSave = async () => {
        try {
            await api.put('/patient/settings', { ...form, age: Number(form.age), gestationalAge: Number(form.gestationalAge), notificationPrefs: notifs });
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
                    <div className="page-header"><h1>Account Settings</h1><p>Manage your profile and preferences</p></div>

                    <div style={{ maxWidth: 700 }}>
                        <div className="glass-card mb-6">
                            <div className="card-header"><h3><User size={16} /> Profile Information</h3></div>
                            <div className="card-body">
                                <div className="form-row">
                                    <div className="form-group"><label>Full Name</label><input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                                    <div className="form-group"><label>Phone</label><input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>Age</label><input className="form-input" type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} /></div>
                                    <div className="form-group"><label>Gestational Age (weeks)</label><input className="form-input" type="number" value={form.gestationalAge} onChange={e => setForm(p => ({ ...p, gestationalAge: e.target.value }))} /></div>
                                </div>
                                <div className="form-group">
                                    <label>Trimester</label>
                                    <select className="form-select" value={form.trimester} onChange={e => setForm(p => ({ ...p, trimester: e.target.value }))}>
                                        <option value="">Select</option>
                                        <option value="first">First</option>
                                        <option value="second">Second</option>
                                        <option value="third">Third</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card mb-6">
                            <div className="card-header"><h3><Shield size={16} /> Privacy & Data</h3></div>
                            <div className="card-body">
                                <div className="settings-row"><div className="settings-row-info"><h4>Data Processing Consent</h4><p>Allow ML analysis of your uploaded medical data</p></div><label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label></div>
                                <div className="settings-row"><div className="settings-row-info"><h4>Anonymous Data Sharing</h4><p>Contribute anonymized data for research purposes</p></div><label className="toggle-switch"><input type="checkbox" /><span className="toggle-slider"></span></label></div>
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
