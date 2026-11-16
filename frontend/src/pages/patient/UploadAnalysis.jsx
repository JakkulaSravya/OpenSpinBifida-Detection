import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { Upload, X, CheckSquare } from 'lucide-react';

export default function UploadAnalysis() {
    const { api } = useAuth();
    const navigate = useNavigate();
    const [ultrasound, setUltrasound] = useState(null);
    const [preview, setPreview] = useState(null);
    const [consent, setConsent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUltrasound(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!ultrasound) { setError('Please upload a fetal brain mid-sagittal ultrasound image.'); return; }
        if (!consent) { setError('Please accept the ML analysis consent.'); return; }
        setError('');
        setLoading(true);

        const formData = new FormData();
        formData.append('ultrasoundImage', ultrasound);

        try {
            const res = await api.post('/ai/upload-analysis', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Store result and navigate to processing view
            sessionStorage.setItem('ai_result', JSON.stringify(res.data.report));
            navigate('/patient/processing');
        } catch (err) {
            console.log("UPLOAD ERROR:", err);
            console.log("SERVER RESPONSE:", err.response);
            setError(err.response?.data?.error || err.message || 'Analysis failed.');
            setLoading(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Fetal Ultrasound Analysis" />
                <div className="page-content fade-in">
                    <div className="page-header">
                        <h1>Fetal Ultrasound Analysis</h1>
                        <p>Upload a fetal mid-sagittal brain ultrasound image for ML-powered Open Spina Bifida screening</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Image Upload */}
                        <div className="glass-card">
                            <div className="card-header"><h3>🔬 Mid-Sagittal Brain Image Upload</h3></div>
                            <div className="card-body">
                                <label>
                                    <div className={`upload-zone ${preview ? '' : ''}`}>
                                        <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                                        {preview ? (
                                            <div className="upload-preview" style={{ flexDirection: 'column' }}>
                                                <img src={preview} alt="Ultrasound" style={{ width: '100%', height: 200, objectFit: 'contain', borderRadius: 8 }} />
                                                <p className="text-sm text-teal mt-2">{ultrasound.name}</p>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={40} className="upload-icon" />
                                                <h4>Upload Mid-Sagittal Brain Image</h4>
                                                <p>Drag & drop or click to browse (Required)</p>
                                            </>
                                        )}
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Consent & Submit */}
                        <div className="glass-card mt-6">
                            <div className="card-body">
                                <label className="form-checkbox mb-4">
                                    <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
                                    <span>I consent to ML-based analysis of the uploaded image. I understand this is for screening purposes only and does not replace professional medical diagnosis.</span>
                                </label>

                                {error && <p className="error-text mb-4">{error}</p>}

                                <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !consent || !ultrasound}>
                                    {loading ? (
                                        <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> Processing...</>
                                    ) : (
                                        <><CheckSquare size={18} /> Start ML Analysis</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
