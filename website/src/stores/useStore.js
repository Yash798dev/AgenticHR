import { create } from 'zustand'

const useStore = create((set, get) => ({
    // Scroll progress (0-1)
    scrollProgress: 0,
    setScrollProgress: (progress) => set({ scrollProgress: progress }),

    // Current scene index
    currentScene: 0,
    setCurrentScene: (scene) => set({ currentScene: scene }),

    // Cursor position (normalized -1 to 1)
    cursorX: 0,
    cursorY: 0,
    setCursor: (x, y) => set({ cursorX: x, cursorY: y }),

    // Loading state
    isLoading: true,
    setLoading: (loading) => set({ isLoading: loading }),

    // Hover state for cursor
    isHovering: false,
    setHovering: (hovering) => set({ isHovering: hovering }),

    // Scene names for labels
    scenes: [
        { id: 0, name: 'hero', title: 'The Void', agent: null },
        { id: 1, name: 'scanner', title: 'AI Resume Screening', agent: 'resume_screener.py' },
        { id: 2, name: 'pulse', title: 'Voice Outreach', agent: 'voice_caller.py' },
        { id: 3, name: 'timeRings', title: 'Smart Scheduling', agent: 'calendar_agent.py' },
        { id: 4, name: 'dialogue', title: 'AI Interviewer', agent: 'interview_agent.py' },
        { id: 5, name: 'analyzer', title: 'Intelligent Scoring', agent: 'transcript_scorer_agent.py' },
        { id: 6, name: 'seal', title: 'Automated Offers', agent: 'offer_letter_agent.py' },
    ],

    // Get current scene data
    getCurrentSceneData: () => {
        const state = get()
        return state.scenes[state.currentScene] || state.scenes[0]
    }
}))

export default useStore
