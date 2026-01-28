import { useEffect, useRef, useState } from 'react'
import useStore from '../../stores/useStore'

/*
 * AGENTIC HR - Fixed UI
 */

const AGENTS = [
    { id: 1, name: 'Resume Screener', file: 'resume_screener.py', icon: '◆', tagline: 'Parse • Score • Rank', desc: 'RAG-powered resume analysis that understands context, not just keywords.', stat: '500+', statLabel: 'resumes/min' },
    { id: 2, name: 'Voice Caller', file: 'voice_caller.py', icon: '◇', tagline: 'Call • Connect • Convert', desc: 'AI phone calls that sound human. Reach candidates 24/7.', stat: '24/7', statLabel: 'availability' },
    { id: 3, name: 'Calendar Agent', file: 'calendar_agent.py', icon: '○', tagline: 'Book • Sync • Remind', desc: 'Zero-conflict scheduling with Google Calendar integration.', stat: '0', statLabel: 'conflicts' },
    { id: 4, name: 'Interview Agent', file: 'interview_agent.py', icon: '▽', tagline: 'Ask • Listen • Analyze', desc: 'Live AI interviews with real-time transcription.', stat: 'Live', statLabel: 'transcription' },
    { id: 5, name: 'Transcript Scorer', file: 'transcript_scorer.py', icon: '□', tagline: 'Read • Evaluate • Score', desc: 'Objective analysis removing human bias from evaluation.', stat: '87%', statLabel: 'accuracy' },
    { id: 6, name: 'Offer Letter Agent', file: 'offer_letter_agent.py', icon: '△', tagline: 'Draft • Sign • Deliver', desc: 'Professional PDF offers generated and sent instantly.', stat: '< 5s', statLabel: 'to send' },
    { id: 7, name: 'Orchestrator', file: 'orchestrator.py', icon: '◎', tagline: 'Coordinate • Execute • Deliver', desc: 'The brain that synchronizes all agents seamlessly.', stat: '7', statLabel: 'agents synced' }
]

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════
export function Navigation() {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <nav className="nav" style={{
            background: scrolled ? 'rgba(8,8,8,0.95)' : 'transparent',
            backdropFilter: scrolled ? 'blur(10px)' : 'none'
        }}>
            <div className="nav-logo">AGENTIC HR</div>
            <div className="nav-links">
                <a href="#agents">Agents</a>
                <a href="#how-it-works">Process</a>
                <a href="#contact" className="nav-cta">Get Started</a>
            </div>
        </nav>
    )
}

// ═══════════════════════════════════════════════════════════════
// HERO - Clean, no stats, no scroll text
// ═══════════════════════════════════════════════════════════════
export function HeroContent() {
    const scrollProgress = useStore((state) => state.scrollProgress)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setTimeout(() => setMounted(true), 100)
    }, [])

    if (scrollProgress > 0.07) return null

    const opacity = 1 - scrollProgress * 14
    const scale = 1 - scrollProgress * 0.5

    return (
        <div className="hero" style={{ opacity, transform: `scale(${scale})` }}>
            <div className="hero-glow" />

            <div className={`hero-content ${mounted ? 'mounted' : ''}`}>
                <div className="hero-label">
                    <span className="hero-label-line" />
                    <span>NEXT-GEN RECRUITING PLATFORM</span>
                    <span className="hero-label-line" />
                </div>

                <h1 className="hero-title">
                    <span className="hero-title-line">AGENTIC</span>
                    <span className="hero-title-line accent">HR</span>
                </h1>

                <p className="hero-tagline">
                    7 AI Agents. Zero Manual Effort.<br />
                    <strong>Autonomous hiring that delivers human results.</strong>
                </p>

                <div className="hero-buttons">
                    <button className="btn-primary">
                        <span>Start Free Trial</span>
                        <span className="btn-arrow">→</span>
                    </button>
                    <button className="btn-ghost">
                        <span className="btn-play">▶</span>
                        <span>Watch Demo</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// AGENT DISPLAY - FIXED NO OVERLAP
// ═══════════════════════════════════════════════════════════════
export function AgentDisplay() {
    const scrollProgress = useStore((state) => state.scrollProgress)

    if (scrollProgress < 0.07 || scrollProgress > 0.80) return null

    const agentRange = (scrollProgress - 0.07) / 0.73
    const agentIndex = Math.min(Math.floor(agentRange * 7), 6)
    const agent = AGENTS[agentIndex]

    const localProgress = (agentRange * 7) % 1

    let opacity = 1
    if (localProgress < 0.12) {
        opacity = localProgress / 0.12
    } else if (localProgress > 0.88) {
        opacity = (1 - localProgress) / 0.12
    }

    if (agentIndex === 6 && scrollProgress > 0.75) {
        opacity *= Math.max(0, (0.80 - scrollProgress) / 0.05)
    }

    return (
        <div className="agent-display" style={{ opacity }}>
            {/* Background number - positioned separately */}
            <div className="agent-bg-num">{String(agent.id).padStart(2, '0')}</div>

            {/* Main content container - prevents overlap */}
            <div className="agent-main">
                <div className="agent-icon">{agent.icon}</div>
                <h2 className="agent-name">{agent.name}</h2>
                <p className="agent-tagline">{agent.tagline}</p>
                <p className="agent-desc">{agent.desc}</p>
            </div>

            {/* Stat box - separate container */}
            <div className="agent-stat-container">
                <span className="stat-value">{agent.stat}</span>
                <span className="stat-label">{agent.statLabel}</span>
            </div>

            {/* File name - at bottom */}
            <code className="agent-file">{agent.file}</code>

            {/* Progress - fixed at bottom of screen */}
            <div className="agent-progress">
                <span>Agent {agentIndex + 1} / 7</span>
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${((agentIndex + localProgress) / 7) * 100}%` }} />
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// SCROLL PROGRESS
// ═══════════════════════════════════════════════════════════════
export function ScrollProgress() {
    const scrollProgress = useStore((state) => state.scrollProgress)

    if (scrollProgress < 0.07 || scrollProgress > 0.80) return null

    const agentRange = (scrollProgress - 0.07) / 0.73
    const activeIndex = Math.min(Math.floor(agentRange * 7), 6)

    return (
        <div className="progress-sidebar">
            {AGENTS.map((agent, i) => (
                <div key={i} className={`sidebar-item ${i === activeIndex ? 'active' : ''}`}>
                    <div className="sidebar-dot" />
                    <span>{agent.name}</span>
                </div>
            ))}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// AGENTS SHOWCASE
// ═══════════════════════════════════════════════════════════════
export function AgentsShowcase() {
    const [selectedAgent, setSelectedAgent] = useState(null)
    const [visibleAgents, setVisibleAgents] = useState([])

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = parseInt(entry.target.dataset.agentId)
                        setVisibleAgents(prev => prev.includes(id) ? prev : [...prev, id])
                    }
                })
            },
            { threshold: 0.15 }
        )

        setTimeout(() => {
            const cards = document.querySelectorAll('.showcase-card')
            cards.forEach(card => observer.observe(card))
        }, 100)

        return () => observer.disconnect()
    }, [])

    return (
        <div className="showcase-section" id="agents">
            <div className="section-header">
                <span className="section-label">THE AGENT SUITE</span>
                <h2>Meet Your AI Team</h2>
                <p>Click any agent to explore capabilities</p>
            </div>

            <div className="showcase-grid">
                {AGENTS.map((agent, i) => (
                    <div
                        key={agent.id}
                        className={`showcase-card ${visibleAgents.includes(agent.id) ? 'visible' : ''} ${selectedAgent?.id === agent.id ? 'expanded' : ''}`}
                        data-agent-id={agent.id}
                        style={{ transitionDelay: `${i * 0.06}s` }}
                        onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                    >
                        <div className="card-row">
                            <div className="card-icon">{agent.icon}</div>
                            <div className="card-info">
                                <h3>{agent.name}</h3>
                                <span>{agent.tagline}</span>
                            </div>
                            <div className="card-stat">
                                <strong>{agent.stat}</strong>
                                <small>{agent.statLabel}</small>
                            </div>
                        </div>

                        {selectedAgent?.id === agent.id && (
                            <div className="card-details">
                                <p>{agent.desc}</p>
                                <code>{agent.file}</code>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// HOW IT WORKS
// ═══════════════════════════════════════════════════════════════
export function HowItWorksSection() {
    const [visible, setVisible] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => entry.isIntersecting && setVisible(true),
            { threshold: 0.2 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    const steps = [
        { icon: '↑', title: 'Upload', desc: 'Drop resumes' },
        { icon: '◆', title: 'Screen', desc: 'AI scores all' },
        { icon: '◇', title: 'Outreach', desc: 'Auto calls' },
        { icon: '○', title: 'Schedule', desc: 'Self-book' },
        { icon: '▽', title: 'Interview', desc: 'Live AI' },
        { icon: '△', title: 'Offer', desc: 'Instant send' },
    ]

    return (
        <div ref={ref} className={`process-section ${visible ? 'visible' : ''}`} id="how-it-works">
            <div className="section-header">
                <span className="section-label">THE PROCESS</span>
                <h2>Resume to Offer in Hours</h2>
            </div>

            <div className="process-flow">
                {steps.map((step, i) => (
                    <div key={i} className="flow-step" style={{ transitionDelay: `${i * 0.1}s` }}>
                        <div className="flow-icon">{step.icon}</div>
                        <h4>{step.title}</h4>
                        <p>{step.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// CTA SECTION
// ═══════════════════════════════════════════════════════════════
export function CTASection() {
    const [visible, setVisible] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => entry.isIntersecting && setVisible(true),
            { threshold: 0.3 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <div ref={ref} className={`cta-section ${visible ? 'visible' : ''}`} id="contact">
            <h2>Ready to Transform Hiring?</h2>
            <p>Join 200+ companies using Agentic HR</p>
            <div className="cta-form">
                <input type="email" placeholder="Your work email" />
                <button className="btn-primary">Get Started Free</button>
            </div>
            <span className="cta-note">Free 14-day trial • No credit card required</span>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════
export function Footer() {
    return (
        <footer className="footer">
            <div className="footer-row">
                <div className="footer-brand">
                    <strong>AGENTIC HR</strong>
                    <p>Autonomous hiring, human results.</p>
                </div>
                <div className="footer-links">
                    <a href="#agents">Agents</a>
                    <a href="#how-it-works">Process</a>
                    <a href="#">Pricing</a>
                    <a href="#">Contact</a>
                </div>
            </div>
            <div className="footer-bottom">
                <p>© 2026 Agentic HR. All rights reserved.</p>
            </div>
        </footer>
    )
}

// ═══════════════════════════════════════════════════════════════
// CURSOR & LOADER
// ═══════════════════════════════════════════════════════════════
export function CustomCursor() {
    const ref = useRef(null)

    useEffect(() => {
        const move = (e) => {
            if (ref.current) {
                ref.current.style.left = `${e.clientX}px`
                ref.current.style.top = `${e.clientY}px`
            }
        }
        window.addEventListener('mousemove', move)
        return () => window.removeEventListener('mousemove', move)
    }, [])

    return <div ref={ref} className="cursor" />
}

export function Loader() {
    const [done, setDone] = useState(false)

    useEffect(() => {
        setTimeout(() => setDone(true), 1000)
    }, [])

    return (
        <div className={`loader ${done ? 'hidden' : ''}`}>
            <div className="loader-logo">AGENTIC HR</div>
        </div>
    )
}

export function SectionContent() { return null }
export function AgentSpotlight() { return null }
