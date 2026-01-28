import { useEffect, useRef } from 'react'
import useStore from '../stores/useStore'

export function useScrollProgress() {
    const setScrollProgress = useStore((state) => state.setScrollProgress)
    const setCurrentScene = useStore((state) => state.setCurrentScene)
    const scenes = useStore((state) => state.scenes)

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY
            const docHeight = document.documentElement.scrollHeight - window.innerHeight
            const progress = Math.min(Math.max(scrollY / docHeight, 0), 1)

            setScrollProgress(progress)

            // Calculate current scene
            const sceneIndex = Math.min(
                Math.floor(progress * scenes.length),
                scenes.length - 1
            )
            setCurrentScene(sceneIndex)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()

        return () => window.removeEventListener('scroll', handleScroll)
    }, [setScrollProgress, setCurrentScene, scenes.length])
}

export function useCursorPosition() {
    const setCursor = useStore((state) => state.setCursor)

    useEffect(() => {
        const handleMouseMove = (e) => {
            const x = (e.clientX / window.innerWidth) * 2 - 1
            const y = -(e.clientY / window.innerHeight) * 2 + 1
            setCursor(x, y)
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [setCursor])
}

export function useSmoothValue(target, smoothing = 0.1) {
    const currentRef = useRef(target)

    useEffect(() => {
        let animationId

        const animate = () => {
            currentRef.current += (target - currentRef.current) * smoothing
            animationId = requestAnimationFrame(animate)
        }

        animationId = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(animationId)
    }, [target, smoothing])

    return currentRef
}
