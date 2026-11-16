/**
 * AIProcessing.jsx  —  Full Report Display
 * Mirrors the Colab Cell 43 output sections:
 *   • Detection Banner
 *   • Measurement Summary (BS/BSOB Ratio)
 *   • CNN Classification Table
 *   • Clinical Finding
 *   • Likely Causes / Risk Factors
 *   • Expected Consequences
 *   • Recommended Actions
 *   • Prognosis
 *   • PDF Download Button
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getBackendOrigin } from '../../config';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Disclaimer from '../../components/Disclaimer';
import {
    Download, ShieldAlert, Shield, ShieldCheck,
    Check, AlertTriangle, Info, Activity,
    Brain, FileText, TrendingUp, Zap
} from 'lucide-react';

// ── Colour map for severity ────────────────────────────────────────────────────
const SEVERITY_STYLES = {
    'normal' : { bg: '#e8f5e9', border: '#2E7D32', text: '#2E7D32', badge: '#2E7D32' },
    'Mild'   : { bg: '#f1f8e9', border: '#639922', text: '#639922', badge: '#639922' },
    'Moderate': { bg: '#fff8e1', border: '#BA7517', text: '#BA7517', badge: '#BA7517' },
    'Severe' : { bg: '#fdecea', border: '#A32D2D', text: '#A32D2D', badge: '#A32D2D' },
};

function getSev(result) {
    if (result.isNormal) return 'normal';
    return result.severity || 'Mild';
}

function ConfBar({ label, value, color, isPred }) {
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: isPred ? 700 : 400, color: 'var(--text-primary)' }}>
                    {isPred ? '▶ ' : ''}{label}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{value?.toFixed(1)}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, height: 10, overflow: 'hidden',
                          border: isPred ? `2px solid ${color}` : 'none' }}>
                <div style={{ height: '100%', width: `${value}%`, background: color,
                              borderRadius: 6, transition: 'width 1s ease' }} />
            </div>
        </div>
    );
}

function SectionCard({ icon, title, children, accentColor }) {
    return (
        <div className="glass-card slide-up mt-6" style={{ borderLeft: `4px solid ${accentColor || 'var(--teal-400)'}` }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {icon}
                <h3 style={{ margin: 0 }}>{title}</h3>
            </div>
            <div className="card-body">{children}</div>
        </div>
    );
}

function BulletList({ items, color }) {
    if (!items?.length) return null;
    return (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                                     padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: color || 'var(--teal-400)', marginTop: 2, flexShrink: 0 }}>●</span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{item}</span>
                </li>
            ))}
        </ul>
    );
}

export default function AIProcessing() {
    const navigate = useNavigate();
    const [result, setResult]     = useState(null);
    const [completed, setCompleted] = useState(false);
    const [pdfDownloading, setPdfDownloading] = useState(false);
    const backendOrigin = getBackendOrigin();

    useEffect(() => {
        const stored = sessionStorage.getItem('ai_result');
        if (!stored) { navigate('/patient/upload'); return; }
        const data = JSON.parse(stored);
        setResult(data);
        const timer = setTimeout(() => setCompleted(true), 3000);
        return () => clearTimeout(timer);
    }, [navigate]);

    const downloadPdf = useCallback(async () => {
        if (!result?.pdfUrl) return;
        const url = `${backendOrigin}${result.pdfUrl}`;
        const filename = result.pdfUrl.split('/').pop() || 'OSB_Clinical_Report.pdf';
        setPdfDownloading(true);
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
            const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
            if (!blob.size || !isPdf) {
                throw new Error('Not a PDF — is the backend running on ' + backendOrigin + '? Set VITE_API_BASE_URL in frontend/.env');
            }
            const obj = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = obj;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(obj);
        } catch (e) {
            console.error(e);
            window.open(url, '_blank', 'noopener,noreferrer');
        } finally {
            setPdfDownloading(false);
        }
    }, [result, backendOrigin]);

    if (!result) return null;

    const sev    = getSev(result);
    const style  = SEVERITY_STYLES[sev] || SEVERITY_STYLES['normal'];
    const probs  = result.cnnProbabilities;
    const isOSB  = !result.isNormal;

    // Map severity → risk icon
    const RiskIcon = sev === 'Severe' ? ShieldAlert : sev === 'Moderate' ? Shield : ShieldCheck;

    // CNN class order
    const cnnClasses = ['Mild OSB', 'Moderate OSB', 'Severe OSB'];
    const cnnColors  = ['#639922', '#BA7517', '#A32D2D'];

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar title="ML Analysis Report" />
                <div
                    className="page-nav-strip"
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '10px 18px',
                        padding: '12px 24px 0',
                        fontSize: '0.88rem',
                    }}
                >
                    <Link
                        to="/patient/dashboard"
                        style={{ color: 'var(--teal-400)', fontWeight: 600, textDecoration: 'none' }}
                    >
                        ← Patient dashboard
                    </Link>
                    <span style={{ opacity: 0.35 }}>|</span>
                    <Link to="/patient/upload" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                        New analysis
                    </Link>
                    <Link to="/patient/reports" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                        All reports
                    </Link>
                </div>
                <div className="page-content fade-in">
                    <div className="page-header">
                        <h1>OSB Screening Report</h1>
                        <p>AI-generated clinical decision support — BS/BSOB Ratio + CNN Classification</p>
                    </div>

                    {/* ── Analyzing animation ──────────────────────────────── */}
                    {!completed ? (
                        <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                            <div className="analyzing-animation">
                                <div className="analyzing-spinner" />
                                <h2 style={{ color: 'var(--text-primary)', marginTop: 28, fontSize: '1.5rem', fontWeight: 600 }}>
                                    Analyzing the image…
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', marginTop: 10, fontSize: '0.95rem' }}>
                                    Running U-Net landmark detection · Grad-CAM · CNN classification
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                                    <span className="analyzing-dot" style={{ animationDelay: '0s' }} />
                                    <span className="analyzing-dot" style={{ animationDelay: '0.2s' }} />
                                    <span className="analyzing-dot" style={{ animationDelay: '0.4s' }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ maxWidth: 800, margin: '0 auto' }}>

                            {/* ── 1. Detection Banner ──────────────────────── */}
                            <div className="glass-card slide-up"
                                 style={{ border: `2px solid ${style.border}`, background: style.bg + '18', marginBottom: 0 }}>
                                <div className="card-body" style={{ textAlign: 'center', padding: '28px 20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                        <RiskIcon size={48} color={style.text} />
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: style.text, letterSpacing: 0.5 }}>
                                        {result.label || (result.isNormal ? 'NORMAL — No OSB Detected' : `OSB DETECTED — ${sev.toUpperCase()}`)}
                                    </div>
                                    {isOSB && (
                                        <div style={{ marginTop: 8, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                            Expected ratio range: <b style={{ color: style.text }}>
                                                {sev === 'Mild' ? '1.0 – 1.3' : sev === 'Moderate' ? '1.3 – 1.6' : '> 1.6'}
                                            </b>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── 2. Measurement Summary ───────────────────── */}
                            <SectionCard icon={<Activity size={18} color="var(--teal-400)" />}
                                         title="📏 BS / BSOB Ratio — Measurement Summary"
                                         accentColor="var(--teal-400)">
                                <div className="report-metrics" style={{ marginBottom: 16 }}>
                                    <div className="report-metric">
                                        <div className="report-metric-value" style={{ color: style.text }}>
                                            {result.ratio?.toFixed(4)}
                                        </div>
                                        <div className="report-metric-label">BS / BSOB Ratio</div>
                                    </div>
                                    {result.BS_px != null && (
                                        <div className="report-metric">
                                            <div className="report-metric-value">{result.BS_px} px</div>
                                            <div className="report-metric-label">Midbrain span (BS)</div>
                                        </div>
                                    )}
                                    {result.BSOB_px != null && (
                                        <div className="report-metric">
                                            <div className="report-metric-value">{result.BSOB_px} px</div>
                                            <div className="report-metric-label">CM distance (BSOB)</div>
                                        </div>
                                    )}
                                </div>

                                {/* Landmark detection status */}
                                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)',
                                              background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                                              padding: '10px 14px', marginTop: 8 }}>
                                    <b>Landmark Detection:</b>{' '}
                                    {result.landmarkDetected
                                        ? <>✅ U-Net successful — Midbrain conf <b>{(result.mb_conf*100).toFixed(0)}%</b>, CM conf <b>{(result.cm_conf*100).toFixed(0)}%</b></>
                                        : <>⚠️ Low confidence — fallback ratio used. Manual review recommended.</>}
                                </div>
                            </SectionCard>

                            {/* ── 3. CNN Classification ────────────────────── */}
                            {isOSB && probs && (
                                <SectionCard icon={<Brain size={18} color="#9b59b6" />}
                                             title="🤖 CNN Classification"
                                             accentColor="#9b59b6">
                                    {cnnClasses.map((cls, i) => (
                                        <ConfBar key={cls}
                                                 label={cls}
                                                 value={probs[cls]}
                                                 color={cnnColors[i]}
                                                 isPred={result.cnnPrediction === cls} />
                                    ))}
                                    <div style={{ marginTop: 14, padding: '10px 14px',
                                                  background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                                                  fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                                        <b>Agreement:</b> {result.agreement || result.agreementNote}
                                    </div>
                                </SectionCard>
                            )}

                            {!isOSB && (
                                <SectionCard icon={<Brain size={18} color="#2E7D32" />}
                                             title="🤖 CNN Classification"
                                             accentColor="#2E7D32">
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                                        CNN classification is <b>not applicable</b> — ratio below 1.0 indicates Normal.
                                        The CNN model is trained on OSB-positive cases; diagnosis here is solely based on the ratio measurement.
                                    </p>
                                </SectionCard>
                            )}

                            {/* ── 4. Clinical Finding ──────────────────────── */}
                            <SectionCard icon={<FileText size={18} color="#3498db" />}
                                         title="🔬 Clinical Finding"
                                         accentColor="#3498db">
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>
                                    {result.clinicalFinding}
                                </p>
                            </SectionCard>

                            {/* ── 5. Likely Causes (OSB only) ──────────────── */}
                            {isOSB && result.causes?.length > 0 && (
                                <SectionCard icon={<AlertTriangle size={18} color="#e67e22" />}
                                             title="⚠️ Likely Causes / Risk Factors"
                                             accentColor="#e67e22">
                                    <BulletList items={result.causes} color="#e67e22" />
                                </SectionCard>
                            )}

                            {/* ── 6. Expected Consequences (OSB only) ──────── */}
                            {isOSB && result.consequences?.length > 0 && (
                                <SectionCard icon={<TrendingUp size={18} color={style.text} />}
                                             title="📋 Expected Consequences"
                                             accentColor={style.text}>
                                    <BulletList items={result.consequences} color={style.text} />
                                </SectionCard>
                            )}

                            {/* ── 7. Recommended Actions ───────────────────── */}
                            <SectionCard icon={<Zap size={18} color="var(--teal-400)" />}
                                         title="🩺 Recommended Actions"
                                         accentColor="var(--teal-400)">
                                {(result.recommendations || result.actions || []).map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0',
                                                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                          alignItems: 'flex-start' }}>
                                        <span style={{ color: 'var(--teal-400)', fontWeight: 700,
                                                       minWidth: 22, flexShrink: 0, fontSize: '0.9rem' }}>
                                            {i + 1}.
                                        </span>
                                        <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </SectionCard>

                            {/* ── 8. Prognosis ─────────────────────────────── */}
                            <SectionCard icon={<Info size={18} color="#8e44ad" />}
                                         title="📈 Prognosis"
                                         accentColor="#8e44ad">
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>
                                    {result.prognosis}
                                </p>
                            </SectionCard>

                            {/* ── 9. Actions ───────────────────────────────── */}
                            <div className="glass-card slide-up mt-6">
                                <div className="card-body">
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {result.pdfUrl && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary"
                                                    disabled={pdfDownloading}
                                                    onClick={() => void downloadPdf()}
                                                >
                                                    <Download size={16} />{' '}
                                                    {pdfDownloading ? 'Preparing…' : 'Download PDF Report'}
                                                </button>
                                                <a
                                                    href={`${backendOrigin}${result.pdfUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-outline"
                                                >
                                                    Open PDF in new tab
                                                </a>
                                            </>
                                        )}
                                        <button className="btn btn-secondary"
                                                onClick={() => navigate('/patient/upload')}>
                                            New Analysis
                                        </button>
                                        <button className="btn btn-secondary"
                                                onClick={() => navigate('/patient/reports')}>
                                            View All Reports
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ── Disclaimer ─────────────────────────────────── */}
                            <div style={{ marginTop: 24, padding: '12px 18px',
                                          background: '#FFF8E1', border: '1px solid #F0A500',
                                          borderRadius: 8 }}>
                                <p style={{ fontSize: '0.78rem', color: '#555', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                                    <b>DISCLAIMER</b> — This report is AI-generated clinical decision support only.
                                    It is NOT a substitute for professional medical diagnosis.
                                    All findings MUST be confirmed by a qualified clinician before any clinical action is taken.
                                </p>
                            </div>

                        </div>
                    )}
                </div>
                <Disclaimer />
            </div>
        </div>
    );
}
