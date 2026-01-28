import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../stores/useStore'

// Shared materials
const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.9,
    thickness: 0.5,
    envMapIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
})

const emissiveMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: 0x3D3D3D,
    emissiveIntensity: 0.3,
    metalness: 0.8,
    roughness: 0.2,
})

// Crystalline Monolith - Hero object
export function Monolith({ position = [0, 0, 0], scale = 1 }) {
    const meshRef = useRef()
    const cursorX = useStore((state) => state.cursorX)
    const cursorY = useStore((state) => state.cursorY)
    const scrollProgress = useStore((state) => state.scrollProgress)

    // Breathing animation + cursor response
    useFrame((state, delta) => {
        if (!meshRef.current) return

        // Breathing scale
        const breathe = Math.sin(state.clock.elapsedTime * 0.5) * 0.02 + 1
        meshRef.current.scale.setScalar(scale * breathe)

        // Cursor tilt (±3 degrees)
        const targetRotX = cursorY * 0.05
        const targetRotY = cursorX * 0.05
        meshRef.current.rotation.x += (targetRotX - meshRef.current.rotation.x) * 0.05
        meshRef.current.rotation.y += (targetRotY - meshRef.current.rotation.y) * 0.05

        // Slow base rotation
        meshRef.current.rotation.z += delta * 0.1

        // Fade out as we scroll down
        const opacity = Math.max(0, 1 - scrollProgress * 3)
        if (meshRef.current.material) {
            meshRef.current.material.opacity = opacity
        }
    })

    return (
        <mesh ref={meshRef} position={position}>
            <boxGeometry args={[1.5, 2.5, 1.5]} />
            <meshPhysicalMaterial
                color={0x111111}
                metalness={0.1}
                roughness={0.05}
                transmission={0.85}
                thickness={0.5}
                envMapIntensity={1.5}
                clearcoat={1}
                clearcoatRoughness={0.1}
                transparent
            />
        </mesh>
    )
}

// Scanner Prism - Resume Screener metaphor
export function ScannerPrism({ position = [0, 0, 0] }) {
    const groupRef = useRef()
    const prismRef = useRef()
    const scrollProgress = useStore((state) => state.scrollProgress)

    useFrame((state, delta) => {
        if (!prismRef.current) return

        // Rotate prism
        prismRef.current.rotation.y += delta * 0.3
        prismRef.current.rotation.z += delta * 0.1

        // Visibility based on scroll
        const sceneProgress = (scrollProgress - 0.1) / 0.15
        const visible = sceneProgress > 0 && sceneProgress < 1.5

        if (groupRef.current) {
            groupRef.current.visible = visible
            const opacity = Math.min(1, sceneProgress) * Math.max(0, 1.5 - sceneProgress)
            groupRef.current.scale.setScalar(visible ? 1 + Math.sin(state.clock.elapsedTime) * 0.05 : 0)
        }
    })

    const prismGeometry = useMemo(() => {
        return new THREE.ConeGeometry(1.2, 2.5, 3)
    }, [])

    return (
        <group ref={groupRef} position={position}>
            <mesh ref={prismRef} geometry={prismGeometry}>
                <meshPhysicalMaterial
                    color={0x1A1A1A}
                    metalness={0.2}
                    roughness={0.1}
                    transmission={0.8}
                    thickness={1}
                    envMapIntensity={2}
                />
            </mesh>
        </group>
    )
}

// Pulse Rings - Voice Caller metaphor
export function PulseRings({ position = [0, 0, 0] }) {
    const groupRef = useRef()
    const ringsRef = useRef([])
    const scrollProgress = useStore((state) => state.scrollProgress)

    useFrame((state) => {
        const sceneProgress = (scrollProgress - 0.25) / 0.15

        if (groupRef.current) {
            groupRef.current.visible = sceneProgress > -0.5 && sceneProgress < 1.5
        }

        ringsRef.current.forEach((ring, i) => {
            if (!ring) return

            // Expanding pulse animation
            const offset = i * 0.5
            const pulse = (state.clock.elapsedTime + offset) % 3
            const scale = 1 + pulse * 0.5
            const opacity = Math.max(0, 1 - pulse / 3)

            ring.scale.setScalar(scale)
            ring.material.opacity = opacity * 0.6
        })
    })

    return (
        <group ref={groupRef} position={position}>
            {[0, 1, 2].map((i) => (
                <mesh
                    key={i}
                    ref={(el) => (ringsRef.current[i] = el)}
                    rotation={[Math.PI / 2, 0, 0]}
                >
                    <torusGeometry args={[1.5, 0.02, 16, 64]} />
                    <meshStandardMaterial
                        color={0xE6E6E6}
                        emissive={0x9B9B9B}
                        emissiveIntensity={0.5}
                        transparent
                        opacity={0.6}
                    />
                </mesh>
            ))}
        </group>
    )
}

// Time Rings - Calendar/Scheduler metaphor
export function TimeRings({ position = [0, 0, 0] }) {
    const groupRef = useRef()
    const ringsRef = useRef([])
    const scrollProgress = useStore((state) => state.scrollProgress)

    useFrame((state, delta) => {
        const sceneProgress = (scrollProgress - 0.4) / 0.15

        if (groupRef.current) {
            groupRef.current.visible = sceneProgress > -0.5 && sceneProgress < 1.5
        }

        ringsRef.current.forEach((ring, i) => {
            if (!ring) return
            // Counter-rotating at different speeds
            const speed = (i + 1) * 0.2 * (i % 2 === 0 ? 1 : -1)
            ring.rotation.z += delta * speed
        })
    })

    const ringConfigs = [
        { radius: 2, thickness: 0.03, color: 0x3D3D3D },
        { radius: 1.5, thickness: 0.02, color: 0x6B6B6B },
        { radius: 1, thickness: 0.015, color: 0x9B9B9B },
    ]

    return (
        <group ref={groupRef} position={position}>
            {ringConfigs.map((config, i) => (
                <group key={i} ref={(el) => (ringsRef.current[i] = el)}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[config.radius, config.thickness, 16, 64]} />
                        <meshStandardMaterial
                            color={config.color}
                            emissive={config.color}
                            emissiveIntensity={0.3}
                        />
                    </mesh>
                    {/* Slot markers */}
                    {[...Array(8)].map((_, j) => (
                        <mesh
                            key={j}
                            position={[
                                Math.cos((j / 8) * Math.PI * 2) * config.radius,
                                Math.sin((j / 8) * Math.PI * 2) * config.radius,
                                0,
                            ]}
                        >
                            <sphereGeometry args={[0.05, 8, 8]} />
                            <meshStandardMaterial
                                color={0xE6E6E6}
                                emissive={0x9B9B9B}
                                emissiveIntensity={0.5}
                            />
                        </mesh>
                    ))}
                </group>
            ))}
        </group>
    )
}

// Dialogue Entities - Interview Agent metaphor
export function DialogueEntities({ position = [0, 0, 0] }) {
    const groupRef = useRef()
    const agentRef = useRef()
    const candidateRef = useRef()
    const scrollProgress = useStore((state) => state.scrollProgress)

    useFrame((state, delta) => {
        const sceneProgress = (scrollProgress - 0.55) / 0.15

        if (groupRef.current) {
            groupRef.current.visible = sceneProgress > -0.5 && sceneProgress < 1.5
        }

        if (agentRef.current && candidateRef.current) {
            // Subtle breathing
            const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.03
            agentRef.current.scale.y = 1 + breathe
            candidateRef.current.scale.y = 1 + breathe * 0.8

            // Gentle rotation toward each other
            agentRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
            candidateRef.current.rotation.y = -Math.sin(state.clock.elapsedTime * 0.3) * 0.1 + Math.PI
        }
    })

    return (
        <group ref={groupRef} position={position}>
            {/* Agent - Angular */}
            <mesh ref={agentRef} position={[-1.5, 0, 0]}>
                <octahedronGeometry args={[0.8, 0]} />
                <meshPhysicalMaterial
                    color={0x111111}
                    metalness={0.9}
                    roughness={0.1}
                    envMapIntensity={1.5}
                />
            </mesh>

            {/* Candidate - Organic */}
            <mesh ref={candidateRef} position={[1.5, 0, 0]}>
                <icosahedronGeometry args={[0.7, 1]} />
                <meshPhysicalMaterial
                    color={0x1A1A1A}
                    metalness={0.3}
                    roughness={0.4}
                    envMapIntensity={1}
                />
            </mesh>

            {/* Connection line */}
            <DataStream start={[-0.7, 0, 0]} end={[0.8, 0, 0]} />
        </group>
    )
}

// Data Stream - Connection visualization
function DataStream({ start, end }) {
    const lineRef = useRef()
    const particlesRef = useRef()

    const particleCount = 20
    const positions = useMemo(() => {
        const pos = new Float32Array(particleCount * 3)
        for (let i = 0; i < particleCount; i++) {
            const t = i / particleCount
            pos[i * 3] = start[0] + (end[0] - start[0]) * t
            pos[i * 3 + 1] = start[1] + (end[1] - start[1]) * t + Math.sin(t * Math.PI) * 0.2
            pos[i * 3 + 2] = start[2] + (end[2] - start[2]) * t
        }
        return pos
    }, [start, end])

    useFrame((state) => {
        if (particlesRef.current) {
            const pos = particlesRef.current.geometry.attributes.position.array
            for (let i = 0; i < particleCount; i++) {
                const t = ((i / particleCount) + state.clock.elapsedTime * 0.3) % 1
                pos[i * 3] = start[0] + (end[0] - start[0]) * t
                pos[i * 3 + 1] = start[1] + (end[1] - start[1]) * t + Math.sin(t * Math.PI * 2) * 0.15
                pos[i * 3 + 2] = start[2] + (end[2] - start[2]) * t
            }
            particlesRef.current.geometry.attributes.position.needsUpdate = true
        }
    })

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particleCount}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.04}
                color={0x9B9B9B}
                transparent
                opacity={0.8}
                sizeAttenuation
            />
        </points>
    )
}

// Analyzer Torus - Transcript Scorer metaphor
export function AnalyzerTorus({ position = [0, 0, 0] }) {
    const groupRef = useRef()
    const torusRef = useRef()
    const scrollProgress = useStore((state) => state.scrollProgress)

    useFrame((state, delta) => {
        const sceneProgress = (scrollProgress - 0.7) / 0.15

        if (groupRef.current) {
            groupRef.current.visible = sceneProgress > -0.5 && sceneProgress < 1.5
        }

        if (torusRef.current) {
            torusRef.current.rotation.x += delta * 0.5
            torusRef.current.rotation.y += delta * 0.3
        }
    })

    return (
        <group ref={groupRef} position={position}>
            <mesh ref={torusRef}>
                <torusGeometry args={[1.2, 0.4, 32, 64]} />
                <meshPhysicalMaterial
                    color={0x111111}
                    metalness={0.2}
                    roughness={0.1}
                    transmission={0.7}
                    thickness={0.8}
                    envMapIntensity={2}
                    emissive={0x3D3D3D}
                    emissiveIntensity={0.2}
                />
            </mesh>

            {/* Score beam */}
            <mesh rotation={[0, 0, Math.PI / 4]}>
                <cylinderGeometry args={[0.02, 0.02, 3, 8]} />
                <meshStandardMaterial
                    color={0x9B9B9B}
                    emissive={0x9B9B9B}
                    emissiveIntensity={1}
                    transparent
                    opacity={0.5}
                />
            </mesh>
        </group>
    )
}

// Seal Token - Offer Letter metaphor
export function SealToken({ position = [0, 0, 0] }) {
    const groupRef = useRef()
    const tokenRef = useRef()
    const scrollProgress = useStore((state) => state.scrollProgress)

    useFrame((state, delta) => {
        const sceneProgress = (scrollProgress - 0.85) / 0.15

        if (groupRef.current) {
            groupRef.current.visible = sceneProgress > -0.5

            // Materialize animation
            const scale = Math.min(1, Math.max(0, sceneProgress * 2))
            groupRef.current.scale.setScalar(scale)
        }

        if (tokenRef.current) {
            tokenRef.current.rotation.y += delta * 0.5
            tokenRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1
        }
    })

    return (
        <group ref={groupRef} position={position}>
            <mesh ref={tokenRef}>
                <cylinderGeometry args={[0.8, 0.8, 0.15, 6]} />
                <meshPhysicalMaterial
                    color={0x1A1A1A}
                    metalness={0.9}
                    roughness={0.1}
                    envMapIntensity={2}
                    emissive={0x6B6B6B}
                    emissiveIntensity={0.3}
                />
            </mesh>

            {/* Glow rim */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.85, 0.03, 16, 6]} />
                <meshStandardMaterial
                    color={0xE6E6E6}
                    emissive={0xFFFFFF}
                    emissiveIntensity={0.5}
                />
            </mesh>
        </group>
    )
}

// Floating Dust Particles
export function FloatingDust({ count = 500 }) {
    const pointsRef = useRef()

    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 20
            pos[i * 3 + 1] = (Math.random() - 0.5) * 20
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20
        }
        return pos
    }, [count])

    useFrame((state) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02
            pointsRef.current.rotation.x = state.clock.elapsedTime * 0.01
        }
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.02}
                color={0x6B6B6B}
                transparent
                opacity={0.3}
                sizeAttenuation
            />
        </points>
    )
}
