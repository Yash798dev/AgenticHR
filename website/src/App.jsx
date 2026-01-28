import { useEffect } from 'react'
import Experience from './components/Experience'
import {
    Navigation,
    HeroContent,
    AgentDisplay,
    AgentsShowcase,
    HowItWorksSection,
    ScrollProgress,
    CustomCursor,
    CTASection,
    Footer,
    Loader
} from './components/ui'
import { useScrollProgress, useCursorPosition } from './hooks'

// 9 scroll sections: hero + 7 agents + transition
function ScrollSections() {
    return (
        <div className="scroll-container">
            <section className="scroll-section" id="hero" />
            <section className="scroll-section" id="agent-1" />
            <section className="scroll-section" id="agent-2" />
            <section className="scroll-section" id="agent-3" />
            <section className="scroll-section" id="agent-4" />
            <section className="scroll-section" id="agent-5" />
            <section className="scroll-section" id="agent-6" />
            <section className="scroll-section" id="agent-7" />
            <section className="scroll-section" id="transition" />
        </div>
    )
}

// Static content after 3D experience
function ContentSections() {
    return (
        <div className="content-sections">
            <AgentsShowcase />
            <HowItWorksSection />
            <CTASection />
            <Footer />
        </div>
    )
}

export default function App() {
    useScrollProgress()
    useCursorPosition()

    return (
        <>
            <Loader />
            <Experience />
            <ScrollSections />
            <ContentSections />
            <div className="ui-overlay">
                <Navigation />
                <HeroContent />
                <AgentDisplay />
                <ScrollProgress />
                <CustomCursor />
            </div>
        </>
    )
}
