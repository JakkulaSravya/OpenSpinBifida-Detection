import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { Star, MapPin, Briefcase, DollarSign, Calendar } from 'lucide-react';

export default function DoctorListing() {
    const { api } = useAuth();
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/patient/doctors').then(r => { setDoctors(r.data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const handleBook = (doctor) => {
        sessionStorage.setItem('booking_doctor', JSON.stringify(doctor));
        navigate('/patient/book');
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Find Specialists" />
                <div className="page-content fade-in">
                    <div className="page-header">
                        <h1>Recommended Specialists</h1>
                        <p>Find and book consultations with fetal medicine experts</p>
                    </div>

                    {loading ? (
                        <div className="page-loader"><div className="spinner"></div></div>
                    ) : (
                        <div className="grid-auto">
                            {doctors.map(doc => (
                                <div key={doc._id} className="glass-card doctor-card">
                                    <div className="doctor-avatar">{doc.name?.charAt(0)}</div>
                                    <div className="doctor-info">
                                        <div className="doctor-name">{doc.name}</div>
                                        <div className="doctor-spec">{doc.specialization}</div>
                                        <div className="doctor-details">
                                            <span><MapPin size={13} /> {doc.hospital || 'General Hospital'}</span>
                                            <span><Briefcase size={13} /> {doc.experience || 0} yrs</span>
                                            <span className="doctor-rating"><Star size={13} /> {doc.rating || 4.5}</span>
                                            <span><DollarSign size={13} /> ₹{doc.consultationFee || 500}</span>
                                        </div>
                                        <button className="btn btn-primary btn-sm mt-4" onClick={() => handleBook(doc)}>
                                            <Calendar size={14} /> Book Consultation
                                        </button>
                                    </div>
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
