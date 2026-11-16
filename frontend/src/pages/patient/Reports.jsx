import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getBackendOrigin } from '../../config';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import { Download, FileText, Check } from 'lucide-react';

export default function Reports() {
    const { api } = useAuth();
    const [reports, setReports] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/patient/reports').then(r => { setReports(r.data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    // Derive severity and OSB result from report data
    const getSeverity = (report) => {
        if (report.cnnPrediction === 'Severe OSB') return 'Severe';
        if (report.cnnPrediction === 'Moderate OSB') return 'Moderate';
        return 'Mild';
    };
    const isOSB = (report) => report.classification === 'Open Spina Bifida Detected';
    const backendOrigin = getBackendOrigin();

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="Screening Reports" />
                <div className="page-content fade-in">
                    <div className="page-header">
                        <h1>ML Screening Reports</h1>
                        <p>View and download your complete diagnosis history</p>
                    </div>

                    {loading ? (
                        <div className="page-loader"><div className="spinner"></div></div>
                    ) : reports.length === 0 ? (
                        <div className="glass-card">
                            <div className="empty-state">
                                <FileText size={48} />
                                <h3>No Reports Yet</h3>
                                <p>Upload an ultrasound image for your first ML screening analysis.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid-2">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {reports.map(report => (
                                    <div key={report._id} className={`glass-card report-card ${selected?._id === report._id ? 'active' : ''}`} onClick={() => setSelected(report)}
                                        style={selected?._id === report._id ? { borderColor: 'rgba(37,99,235,0.4)' } : {}}>
                                        <div className="report-header-row">
                                            <span className={`risk-badge ${report.riskLevel?.toLowerCase()}`}>{report.riskLevel} Risk</span>
                                            <span className="report-date">{new Date(report.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm" style={{ color: isOSB(report) ? 'var(--red-400)' : 'var(--green-400)', marginTop: 6 }}>
                                            {isOSB(report) ? `OSB Detected — ${getSeverity(report)}` : 'No OSB Detected'}
                                        </p>
                                        <div className="report-metrics" style={{ marginTop: 10 }}>
                                            <div className="report-metric">
                                                <div className="report-metric-value">{report.bsRatio}</div>
                                                <div className="report-metric-label">BS/BSOB Ratio</div>
                                            </div>
                                            <div className="report-metric">
                                                <div className="report-metric-value">{report.bsValue}mm</div>
                                                <div className="report-metric-label">BS</div>
                                            </div>
                                            <div className="report-metric">
                                                <div className="report-metric-value">{report.bsobValue}mm</div>
                                                <div className="report-metric-label">BSOB</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selected && (
                                <div className="glass-card slide-up">
                                    <div className="card-header">
                                        <h3>Report Details</h3>
                                        {selected.pdfUrl && (
                                            <a href={`${backendOrigin}${selected.pdfUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                                                <Download size={14} /> PDF
                                            </a>
                                        )}
                                    </div>
                                    <div className="card-body">
                                        {/* Result */}
                                        <div className="mb-4" style={{ textAlign: 'center' }}>
                                            <span className={`risk-badge ${selected.riskLevel?.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '6px 16px' }}>
                                                {isOSB(selected) ? `OSB Detected — ${getSeverity(selected)}` : 'No OSB Detected'}
                                            </span>
                                        </div>

                                        {/* BS/BSOB Ratio */}
                                        <h4 className="text-sm font-semibold text-white mb-2">BS / BSOB Ratio</h4>
                                        <div className="report-metrics mb-4">
                                            <div className="report-metric"><div className="report-metric-value">{selected.bsValue}mm</div><div className="report-metric-label">Brain Stem (BS)</div></div>
                                            <div className="report-metric"><div className="report-metric-value">{selected.bsobValue}mm</div><div className="report-metric-label">BSOB</div></div>
                                            <div className="report-metric"><div className="report-metric-value">{selected.bsRatio}</div><div className="report-metric-label">BS/BSOB Ratio</div></div>
                                        </div>

                                        {/* Advised Clinical Action */}
                                        {selected.recommendations?.length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="text-sm font-semibold text-white mb-2">🩺 Advised Clinical Action</h4>
                                                {selected.recommendations.map((r, i) => (
                                                    <div key={i} className="flex items-center gap-3" style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <Check size={14} color="var(--teal-400)" />
                                                        <span className="text-sm">{r}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
