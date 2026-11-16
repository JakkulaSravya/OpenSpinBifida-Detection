import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Upload, FileText, UserSearch, Calendar,
    MessageSquare, Settings, LogOut, Stethoscope, ClipboardList,
    CalendarDays, FolderOpen, Brain
} from 'lucide-react';

const patientLinks = [
    {
        section: 'Main', items: [
            { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/patient/upload', icon: Upload, label: 'Upload & Analysis' },
            { to: '/patient/reports', icon: FileText, label: 'Reports' },
        ]
    },
    {
        section: 'Consultation', items: [
            { to: '/patient/doctors', icon: UserSearch, label: 'Find Doctors' },
            { to: '/patient/appointments', icon: Calendar, label: 'Appointments' },
            { to: '/patient/messages', icon: MessageSquare, label: 'Messages' },
        ]
    },
    {
        section: 'Account', items: [
            { to: '/patient/settings', icon: Settings, label: 'Settings' },
        ]
    }
];

const doctorLinks = [
    {
        section: 'Main', items: [
            { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/doctor/consultations', icon: ClipboardList, label: 'Consultations' },
            { to: '/doctor/schedule', icon: CalendarDays, label: 'Schedule' },
        ]
    },
    {
        section: 'Clinical', items: [
            { to: '/doctor/cases', icon: FolderOpen, label: 'Case History' },
            { to: '/doctor/messages', icon: MessageSquare, label: 'Messages' },
        ]
    },
    {
        section: 'Account', items: [
            { to: '/doctor/settings', icon: Settings, label: 'Settings' },
        ]
    }
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const links = user?.role === 'doctor' ? doctorLinks : patientLinks;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">
                        <Brain size={22} color="white" />
                    </div>
                    <div className="sidebar-brand-text">
                        <h2>OSBCheck</h2>
                        <span>Spina Bifida Screening</span>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {links.map(section => (
                    <div className="sidebar-section" key={section.section}>
                        <div className="sidebar-section-title">{section.section}</div>
                        {section.items.map(link => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                            >
                                <link.icon size={18} className="link-icon" />
                                {link.label}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.name || 'User'}</div>
                        <div className="sidebar-user-role">{user?.role || 'patient'}</div>
                    </div>
                    <button className="btn-icon" onClick={handleLogout} title="Logout" style={{ color: 'var(--slate-400)' }}>
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
