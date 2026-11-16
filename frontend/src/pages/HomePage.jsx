import { Link } from 'react-router-dom';
import { Brain, Shield, Activity, Stethoscope, Heart, AlertTriangle, BookOpen, ArrowRight, ChevronDown, Users, Microscope, Baby, Pill, Scan, Syringe } from 'lucide-react';

const TYPES = [
    {
        title: 'Spina Bifida Occulta',
        severity: 'Mildest Form',
        color: '#22c55e',
        icon: Shield,
        desc: 'The most common and mildest form. "Occulta" means hidden — the spinal cord and nerves are usually normal. A small gap exists in one or more vertebrae, but the spinal cord does not protrude. Most people with this form don\'t even know they have it unless discovered incidentally through imaging. It rarely causes symptoms or disabilities.',
        symptoms: ['Usually no symptoms', 'Small dimple or tuft of hair on the back', 'Rarely causes neurological problems'],
    },
    {
        title: 'Meningocele',
        severity: 'Moderate Form',
        color: '#f59e0b',
        icon: Activity,
        desc: 'In this form, the protective membranes (meninges) around the spinal cord push through the opening in the vertebrae, forming a fluid-filled sac on the baby\'s back. The spinal cord itself is not in the sac, so nerve damage is less likely. This form can be repaired with surgery, and many individuals experience little to no nerve damage afterward.',
        symptoms: ['Visible sac on the back at birth', 'Minor nerve damage possible', 'Usually correctable with surgery'],
    },
    {
        title: 'Myelomeningocele',
        severity: 'Most Severe Form',
        color: '#ef4444',
        icon: AlertTriangle,
        desc: 'The most serious and most common clinically significant type. A portion of the spinal cord and nerves protrude through the open vertebrae, forming a sac on the baby\'s back. This causes moderate to severe disabilities including muscle weakness or paralysis below the affected area, bowel and bladder dysfunction, and often hydrocephalus (excess fluid in the brain). Requires surgical closure within 24–48 hours of birth.',
        symptoms: ['Significant nerve damage & paralysis', 'Bowel and bladder problems', 'Hydrocephalus (in ~80% of cases)', 'Learning difficulties possible'],
    },
];

const CAUSES = [
    { icon: Pill, title: 'Folic Acid Deficiency', desc: 'Insufficient folic acid (vitamin B9) before and during early pregnancy is the most significant modifiable risk factor. The neural tube forms in the first 28 days of pregnancy, often before a woman knows she is pregnant.' },
    { icon: Microscope, title: 'Genetic Factors', desc: 'A family history of neural tube defects increases risk. If one child is born with spina bifida, the chance of a subsequent child having it rises to 2–3%. Certain gene variants involved in folate metabolism (e.g., MTHFR) also contribute.' },
    { icon: Syringe, title: 'Medications', desc: 'Anti-seizure medications such as valproic acid and carbamazepine have been linked to increased risk of neural tube defects. Women taking these medications should consult their doctor about folate supplementation.' },
    { icon: Activity, title: 'Maternal Diabetes', desc: 'Women with pre-existing (not gestational) diabetes who do not effectively control their blood sugar levels have a higher risk of having a baby with spina bifida.' },
    { icon: AlertTriangle, title: 'Obesity', desc: 'Pre-pregnancy obesity is associated with an increased risk of neural tube defects, including spina bifida. Maintaining a healthy weight before conception is recommended.' },
    { icon: Heart, title: 'Hyperthermia', desc: 'Elevated body temperature in early pregnancy from high fevers, hot tub use, or saunas may increase risk. Avoiding excessive heat exposure in the first trimester is advised.' },
];

const SIDE_EFFECTS = [
    { title: 'Physical & Mobility', items: ['Partial or complete paralysis of the legs', 'Orthopedic abnormalities (club foot, hip dislocations, scoliosis)', 'Muscle weakness below the affected spinal level', 'Need for assistive devices (braces, crutches, wheelchair)'] },
    { title: 'Neurological', items: ['Hydrocephalus requiring shunt placement in ~80% of myelomeningocele cases', 'Chiari II malformation (brainstem herniation)', 'Tethered spinal cord syndrome', 'Seizures in some cases'] },
    { title: 'Urological & Bowel', items: ['Neurogenic bladder — inability to control urination', 'Recurrent urinary tract infections', 'Kidney damage if not managed properly', 'Bowel incontinence or chronic constipation'] },
    { title: 'Cognitive & Psychosocial', items: ['Learning disabilities (particularly in math & reading comprehension)', 'Attention difficulties', 'Psychosocial challenges and depression', 'Normal to above-average intelligence in many cases'] },
    { title: 'Skin & Sensory', items: ['Loss of sensation below the defect level', 'Skin breakdown and pressure sores', 'Latex allergy (common in individuals with spina bifida)', 'Chronic pain in some cases'] },
];

export default function HomePage() {
    return (
        <div className="homepage">
            {/* Navbar */}
            <nav className="home-nav">
                <div className="home-nav-inner">
                    <Link to="/" className="home-brand">
                        <div className="home-brand-icon"><Brain size={22} color="white" /></div>
                        <span className="home-brand-text">OSBCheck</span>
                    </Link>
                    <div className="home-nav-links">
                        <a href="#about" className="home-nav-link">About</a>
                        <a href="#types" className="home-nav-link">Types</a>
                        <a href="#causes" className="home-nav-link">Causes</a>
                        <a href="#effects" className="home-nav-link">Side Effects</a>
                        <Link to="/login" className="btn btn-ghost home-nav-btn">Sign In</Link>
                        <Link to="/register" className="btn btn-primary home-nav-btn">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="home-hero">
                <div className="home-hero-bg"></div>
                <div className="home-hero-content">
                    <div className="home-hero-badge">🧠 ML-Powered Prenatal Screening</div>
                    <h1 className="home-hero-title">
                        Early Detection of<br />
                        <span className="gradient-text">Open Spina Bifida</span>
                    </h1>
                    <p className="home-hero-subtitle">
                        Empowering early prenatal screening using advanced deep learning models for accurate and timely detection of neural tube defects.
                        Learn about Spina Bifida, connect with specialists, and take proactive steps for maternal-fetal health.
                    </p>
                    <div className="home-hero-actions">
                        <Link to="/register" className="btn btn-primary btn-lg home-hero-btn">
                            Start Screening <ArrowRight size={18} />
                        </Link>
                        <a href="#about" className="btn btn-ghost btn-lg home-hero-btn">
                            Learn More <ChevronDown size={18} />
                        </a>
                    </div>
                    <div className="home-hero-stats">
                        <div className="home-stat"><span className="home-stat-num">1 in 2,500</span><span className="home-stat-label">Live births affected</span></div>
                        <div className="home-stat-divider"></div>
                        <div className="home-stat"><span className="home-stat-num">~300,000</span><span className="home-stat-label">Cases worldwide per year</span></div>
                        <div className="home-stat-divider"></div>
                        <div className="home-stat"><span className="home-stat-num">70%</span><span className="home-stat-label">Preventable with folic acid</span></div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="home-section" id="about">
                <div className="home-section-inner">
                    <div className="home-section-header">
                        <span className="home-section-tag"><BookOpen size={14} /> About</span>
                        <h2 className="home-section-title">What is Spina Bifida?</h2>
                        <p className="home-section-desc">
                            A neural tube defect impacting the development of the spine and nervous system
                        </p>
                    </div>

                    <div className="home-about-grid">
                        <div className="home-about-card glass-card">
                            <h3>Definition</h3>
                            <p>
                                Spina Bifida is a <strong>neural tube defect (NTD)</strong> — a type of birth defect that occurs when the neural tube, which forms the early brain and spine of an embryo, fails to close completely during the first 28 days of pregnancy. The name literally means <em>"split spine"</em> in Latin.
                            </p>
                            <p>
                                When the neural tube doesn't close properly, the backbone (vertebrae) that protects the spinal cord doesn't form completely, resulting in damage to the spinal cord and surrounding nerves. The severity of the condition depends on the size and location of the opening, and whether the spinal cord and its covering (meninges) are affected.
                            </p>
                        </div>
                        <div className="home-about-card glass-card">
                            <h3>Prevalence & Impact</h3>
                            <p>
                                Spina Bifida affects approximately <strong>1 in every 2,500 live births worldwide</strong>. It is the most common neural tube defect and one of the most common permanently disabling birth defects. Each year, about <strong>300,000 babies</strong> are born with neural tube defects globally.
                            </p>
                            <p>
                                The condition is a lifelong condition with no cure, but early detection, surgical intervention, and ongoing medical care can significantly improve outcomes and quality of life. Prenatal screening through ultrasound and maternal serum tests (like AFP — alpha-fetoprotein) play a <strong>critical role in early diagnosis</strong>.
                            </p>
                        </div>
                        <div className="home-about-card glass-card full-width">
                            <h3>Why Prenatal Screening Matters</h3>
                            <p>
                                Early detection through prenatal screening allows families and medical teams to prepare and plan for specialized care. Ultrasound can detect open spina bifida as early as the <strong>second trimester (18–22 weeks)</strong>. Higher levels of <strong>alpha-fetoprotein (AFP)</strong> in maternal blood can indicate an open neural tube defect. In some cases, <strong>fetal surgery</strong> performed before birth (in-utero) has shown improved outcomes compared to postnatal repair. OSBCheck leverages artificial intelligence to enhance the accuracy and speed of prenatal detection, helping clinicians make more informed decisions.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Types Section */}
            <section className="home-section home-section-alt" id="types">
                <div className="home-section-inner">
                    <div className="home-section-header">
                        <span className="home-section-tag"><Scan size={14} /> Classification</span>
                        <h2 className="home-section-title">Types of Spina Bifida</h2>
                        <p className="home-section-desc">
                            There are three main types, ranging from mild to severe. Each has different implications for the affected individual.
                        </p>
                    </div>

                    <div className="home-types-grid">
                        {TYPES.map((t, i) => (
                            <div className="home-type-card glass-card" key={i}>
                                <div className="home-type-icon" style={{ background: `${t.color}22`, color: t.color }}>
                                    <t.icon size={28} />
                                </div>
                                <div className="home-type-severity" style={{ color: t.color }}>{t.severity}</div>
                                <h3>{t.title}</h3>
                                <p>{t.desc}</p>
                                <ul className="home-type-symptoms">
                                    {t.symptoms.map((s, j) => (
                                        <li key={j}><span className="home-type-dot" style={{ background: t.color }}></span>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Causes Section */}
            <section className="home-section" id="causes">
                <div className="home-section-inner">
                    <div className="home-section-header">
                        <span className="home-section-tag"><Microscope size={14} /> Etiology</span>
                        <h2 className="home-section-title">Causes & Risk Factors</h2>
                        <p className="home-section-desc">
                            The exact cause of spina bifida is unknown, but a combination of genetic and environmental factors contribute to the risk.
                        </p>
                    </div>

                    <div className="home-causes-grid">
                        {CAUSES.map((c, i) => (
                            <div className="home-cause-card glass-card" key={i}>
                                <div className="home-cause-icon"><c.icon size={22} /></div>
                                <h4>{c.title}</h4>
                                <p>{c.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Side Effects Section */}
            <section className="home-section home-section-alt" id="effects">
                <div className="home-section-inner">
                    <div className="home-section-header">
                        <span className="home-section-tag"><Heart size={14} /> Health Impact</span>
                        <h2 className="home-section-title">Side Effects & Complications</h2>
                        <p className="home-section-desc">
                            Spina Bifida can affect multiple body systems. The severity depends on the type, location, and extent of the spinal defect.
                        </p>
                    </div>

                    <div className="home-effects-grid">
                        {SIDE_EFFECTS.map((se, i) => (
                            <div className="home-effect-card glass-card" key={i}>
                                <h4>{se.title}</h4>
                                <ul>
                                    {se.items.map((item, j) => (
                                        <li key={j}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Diagnosis & Treatment */}
            <section className="home-section" id="diagnosis">
                <div className="home-section-inner">
                    <div className="home-section-header">
                        <span className="home-section-tag"><Stethoscope size={14} /> Medical Care</span>
                        <h2 className="home-section-title">Diagnosis & Treatment</h2>
                    </div>

                    <div className="home-about-grid">
                        <div className="home-about-card glass-card">
                            <h3>🔬 Diagnosis Methods</h3>
                            <ul className="home-detail-list">
                                <li><strong>Maternal Serum AFP Test:</strong> Elevated levels of alpha-fetoprotein (AFP) in the mother's blood during the second trimester can indicate an open neural tube defect. This is a screening test, not diagnostic.</li>
                                <li><strong>Prenatal Ultrasound:</strong> High-resolution ultrasound at 18–22 weeks can identify physical markers of spina bifida, including the "lemon sign" (skull shape) and "banana sign" (cerebellum shape).</li>
                                <li><strong>Amniocentesis:</strong> If AFP levels are elevated, amniocentesis can be performed to measure AFP and acetylcholinesterase levels in the amniotic fluid for confirmation.</li>
                                <li><strong>Fetal MRI:</strong> Provides detailed images of the fetal spine and brain for more accurate characterization of the defect and planning for treatment.</li>
                            </ul>
                        </div>
                        <div className="home-about-card glass-card">
                            <h3>💊 Treatment Options</h3>
                            <ul className="home-detail-list">
                                <li><strong>Prenatal Surgery (Fetal Repair):</strong> In select cases of myelomeningocele, in-utero repair surgery (before 26 weeks) has shown reduced need for shunting and improved motor outcomes (MOMS trial).</li>
                                <li><strong>Postnatal Surgery:</strong> Surgical closure of the spinal defect within 24–48 hours of birth to prevent infection and further nerve damage.</li>
                                <li><strong>Shunt Placement:</strong> For hydrocephalus, a ventriculoperitoneal (VP) shunt diverts excess cerebrospinal fluid from the brain to the abdomen.</li>
                                <li><strong>Ongoing Rehabilitation:</strong> Physical therapy, occupational therapy, urological management, orthopedic interventions, and psychosocial support throughout life.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Prevention */}
            <section className="home-section home-section-alt" id="prevention">
                <div className="home-section-inner">
                    <div className="home-section-header">
                        <span className="home-section-tag"><Shield size={14} /> Prevention</span>
                        <h2 className="home-section-title">Prevention</h2>
                    </div>

                    <div className="home-prevention-card glass-card">
                        <div className="home-prevention-content">
                            <h3>Folic Acid — The #1 Preventive Measure</h3>
                            <p>
                                Studies have consistently shown that taking <strong>400 micrograms (0.4 mg)</strong> of folic acid daily, starting at least <strong>one month before conception</strong> and continuing through the first trimester, can reduce the risk of neural tube defects like spina bifida by up to <strong>70%</strong>.
                            </p>
                            <div className="home-prevention-tips">
                                <div className="home-prevention-tip">
                                    <span className="home-tip-icon">💊</span>
                                    <div>
                                        <strong>Daily Supplement</strong>
                                        <p>All women of childbearing age should take 400 mcg of folic acid daily, even if not planning pregnancy.</p>
                                    </div>
                                </div>
                                <div className="home-prevention-tip">
                                    <span className="home-tip-icon">🥬</span>
                                    <div>
                                        <strong>Folate-Rich Diet</strong>
                                        <p>Eat leafy greens, fortified cereals, beans, citrus fruits, and whole grains regularly.</p>
                                    </div>
                                </div>
                                <div className="home-prevention-tip">
                                    <span className="home-tip-icon">⚠️</span>
                                    <div>
                                        <strong>High-Risk Women</strong>
                                        <p>Women with a previous NTD-affected pregnancy should take 4 mg/day (10x the standard dose), as prescribed by their doctor.</p>
                                    </div>
                                </div>
                                <div className="home-prevention-tip">
                                    <span className="home-tip-icon">🏥</span>
                                    <div>
                                        <strong>Prenatal Care</strong>
                                        <p>Regular prenatal check-ups, managing diabetes, reviewing medications, and maintaining healthy weight all reduce risk.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How OSBCheck Helps */}
            <section className="home-section">
                <div className="home-section-inner">
                    <div className="home-section-header">
                        <span className="home-section-tag"><Brain size={14} /> Our Technology</span>
                        <h2 className="home-section-title">How OSBCheck Helps</h2>
                        <p className="home-section-desc">Our platform combines ML-powered screening with expert consultation.</p>
                    </div>

                    <div className="home-features-grid">
                        <div className="home-feature-card glass-card">
                            <div className="home-feature-num">01</div>
                            <h4>ML-Powered Analysis</h4>
                            <p>Upload prenatal ultrasound images for instant ML-assisted analysis. Our CNN model detects markers associated with open spina bifida with high accuracy.</p>
                        </div>
                        <div className="home-feature-card glass-card">
                            <div className="home-feature-num">02</div>
                            <h4>Expert Consultation</h4>
                            <p>Connect directly with fetal medicine specialists, pediatric neurosurgeons, and genetic counselors for professional medical opinions.</p>
                        </div>
                        <div className="home-feature-card glass-card">
                            <div className="home-feature-num">03</div>
                            <h4>Comprehensive Reports</h4>
                            <p>Receive detailed PDF reports with risk assessments, visualizations, and recommendations that you can share with your healthcare team.</p>
                        </div>
                        <div className="home-feature-card glass-card">
                            <div className="home-feature-num">04</div>
                            <h4>Secure & Confidential</h4>
                            <p>All medical data is encrypted and handled with strict confidentiality. Your privacy and data security are our top priority.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="home-cta">
                <div className="home-cta-content">
                    <h2>Ready to Take the First Step?</h2>
                    <p>Create your account today to access ML-powered prenatal screening and connect with leading specialists.</p>
                    <div className="home-hero-actions">
                        <Link to="/register" className="btn btn-primary btn-lg home-hero-btn">Create Free Account <ArrowRight size={18} /></Link>
                        <Link to="/login" className="btn btn-ghost btn-lg home-hero-btn">Sign In</Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="home-footer">
                <div className="home-footer-inner">
                    <div className="home-footer-brand">
                        <Brain size={20} color="var(--teal-400)" />
                        <span>OSBCheck</span>
                    </div>
                    <p className="home-footer-disclaimer">
                        ⚠️ Disclaimer: OSBCheck is an educational and screening assistance tool. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical decisions.
                    </p>
                    <p className="home-footer-copy">© 2026 OSBCheck — Spina Bifida Prenatal Detection Platform</p>
                </div>
            </footer>
        </div>
    );
}
