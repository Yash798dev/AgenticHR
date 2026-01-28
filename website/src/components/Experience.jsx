import { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import useStore from '../stores/useStore'

/*
 * AGENTIC HR - Clean 3D Experience
 * Smooth | Fast | Elegant
 */

// ═══════════════════════════════════════════════════════════════
// SMOOTH CAMERA
// ═══════════════════════════════════════════════════════════════
function SmoothCamera() {
    const { camera } = useThree()
    const scrollProgress = useStore((state) => state.scrollProgress)
    const cursorX = useStore((state) => state.cursorX)
    const cursorY = useStore((state) => state.cursorY)

    const smoothScroll = useRef(0)
    const smoothX = useRef(0)
    const smoothY = useRef(0)

    useFrame(() => {
        // Smooth interpolation
        smoothScroll.current += (scrollProgress - smoothScroll.current) * 0.04
        smoothX.current += (cursorX - smoothX.current) * 0.04
        smoothY.current += (cursorY - smoothY.current) * 0.04

        const p = smoothScroll.current

        // Camera path
        const z = 15 - p * 28
        const y = 2 + Math.sin(p * Math.PI) * 4
        const x = smoothX.current * 2.5

        camera.position.x += (x - camera.position.x) * 0.04
        camera.position.y += (y + smoothY.current * 1.5 - camera.position.y) * 0.04
        camera.position.z += (z - camera.position.z) * 0.04

        camera.lookAt(smoothX.current * 0.3, smoothY.current * 0.2, -p * 20)
    })

    return null
}

// ═══════════════════════════════════════════════════════════════
// SCENE 1: MORPHING SPHERES
// ═══════════════════════════════════════════════════════════════
function MorphingSpheres() {
    const groupRef = useRef()
    const scrollProgress = useStore((state) => state.scrollProgress)
    const cursorX = useStore((state) => state.cursorX)
    const cursorY = useStore((state) => state.cursorY)

    useFrame((state) => {
        if (!groupRef.current) return

        const t = state.clock.elapsedTime
        groupRef.current.rotation.y = t * 0.08 + cursorX * 0.2
        groupRef.current.rotation.x = cursorY * 0.15

        // Smooth fade
        const scale = Math.max(0, 1 - scrollProgress * 2)
        groupRef.current.scale.setScalar(scale)
        groupRef.current.visible = scale > 0.01
    })

    return (
        <group ref={groupRef} position={[0, 2, 0]}>
            {/* Main sphere */}
            <mesh>
                <sphereGeometry args={[1.6, 32, 32]} />
                <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
            </mesh>

            {/* Orbiting spheres */}
            {[...Array(6)].map((_, i) => (
                <OrbitingSphere key={i} index={i} total={6} />
            ))}

            {/* Rings */}
            <Ring radius={3} speed={0.15} />
            <Ring radius={3.6} speed={-0.1} />
        </group>
    )
}

function OrbitingSphere({ index, total }) {
    const meshRef = useRef()
    const angle = (index / total) * Math.PI * 2

    useFrame((state) => {
        if (!meshRef.current) return
        const t = state.clock.elapsedTime * 0.4 + angle
        const radius = 2.8
        meshRef.current.position.x = Math.cos(t) * radius
        meshRef.current.position.y = Math.sin(t * 2) * 0.6
        meshRef.current.position.z = Math.sin(t) * radius
    })

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
        </mesh>
    )
}

function Ring({ radius, speed }) {
    const meshRef = useRef()

    useFrame((state) => {
        if (!meshRef.current) return
        meshRef.current.rotation.z = state.clock.elapsedTime * speed
    })

    return (
        <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.015, 16, 80]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.35} />
        </mesh>
    )
}

// ═══════════════════════════════════════════════════════════════
// SCENE 2: FLOWING CUBES
// ═══════════════════════════════════════════════════════════════
function FlowingCubes() {
    const groupRef = useRef()
    const scrollProgress = useStore((state) => state.scrollProgress)

    useFrame(() => {
        if (!groupRef.current) return
        const visible = scrollProgress > 0.15 && scrollProgress < 0.55
        groupRef.current.visible = visible

        if (visible) {
            const p = (scrollProgress - 0.15) / 0.4
            groupRef.current.scale.setScalar(0.6 + p * 0.4)
        }
    })

    const cubes = useMemo(() => {
        const items = []
        for (let x = -2; x <= 2; x++) {
            for (let y = -1; y <= 1; y++) {
                items.push({ x: x * 1.4, y: y * 1.4, delay: Math.abs(x) + Math.abs(y) })
            }
        }
        return items
    }, [])

    return (
        <group ref={groupRef} position={[0, 0, -12]}>
            {cubes.map((cube, i) => (
                <FloatingCube key={i} {...cube} index={i} />
            ))}
        </group>
    )
}

function FloatingCube({ x, y, delay, index }) {
    const meshRef = useRef()

    useFrame((state) => {
        if (!meshRef.current) return
        const t = state.clock.elapsedTime
        meshRef.current.position.z = Math.sin(t * 0.8 + delay) * 0.4
        meshRef.current.rotation.x = t * 0.15 + delay
        meshRef.current.rotation.y = t * 0.2
    })

    return (
        <Float speed={1.5} floatIntensity={0.2}>
            <mesh ref={meshRef} position={[x, y, 0]}>
                <boxGeometry args={[0.7, 0.7, 0.7]} />
                <meshStandardMaterial
                    color={index % 2 === 0 ? '#ffffff' : '#333333'}
                    metalness={0.7}
                    roughness={0.3}
                />
            </mesh>
        </Float>
    )
}

// ═══════════════════════════════════════════════════════════════
// SCENE 3: TORUS RINGS
// ═══════════════════════════════════════════════════════════════
function TorusRings() {
    const groupRef = useRef()
    const scrollProgress = useStore((state) => state.scrollProgress)

    useFrame((state) => {
        if (!groupRef.current) return
        const visible = scrollProgress > 0.4 && scrollProgress < 0.85
        groupRef.current.visible = visible

        if (visible) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.15
            groupRef.current.rotation.z = state.clock.elapsedTime * 0.08
        }
    })

    return (
        <group ref={groupRef} position={[0, 0, -25]}>
            <SpinningTorus radius={2.2} tube={0.12} speed={0.8} color="#ffffff" />
            <SpinningTorus radius={3} tube={0.08} speed={-0.5} color="#888888" />
            <SpinningTorus radius={3.8} tube={0.06} speed={0.35} color="#444444" />

            {/* Center orb */}
            <mesh>
                <sphereGeometry args={[0.9, 32, 32]} />
                <meshStandardMaterial
                    color="#ffffff"
                    metalness={0.95}
                    roughness={0.05}
                    emissive="#ffffff"
                    emissiveIntensity={0.1}
                />
            </mesh>
        </group>
    )
}

function SpinningTorus({ radius, tube, speed, color }) {
    const meshRef = useRef()

    useFrame((state) => {
        if (!meshRef.current) return
        meshRef.current.rotation.x = state.clock.elapsedTime * speed
        meshRef.current.rotation.z = state.clock.elapsedTime * speed * 0.4
    })

    return (
        <mesh ref={meshRef}>
            <torusGeometry args={[radius, tube, 16, 64]} />
            <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
        </mesh>
    )
}

// ═══════════════════════════════════════════════════════════════
// SCENE 4: FINAL TOKEN
// ═══════════════════════════════════════════════════════════════
function FinalToken() {
    const groupRef = useRef()
    const tokenRef = useRef()
    const scrollProgress = useStore((state) => state.scrollProgress)

    useFrame((state) => {
        if (!groupRef.current) return
        const visible = scrollProgress > 0.7
        groupRef.current.visible = visible

        if (visible && tokenRef.current) {
            tokenRef.current.rotation.y = state.clock.elapsedTime * 0.4
            tokenRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.25

            // Smooth scale in
            const p = Math.min(1, (scrollProgress - 0.7) / 0.15)
            groupRef.current.scale.setScalar(p)
        }
    })

    return (
        <group ref={groupRef} position={[0, 0, -36]}>
            <Float speed={1.5} floatIntensity={0.4}>
                <group ref={tokenRef}>
                    {/* Hexagon token */}
                    <mesh>
                        <cylinderGeometry args={[1.8, 1.8, 0.22, 6]} />
                        <meshStandardMaterial color="#ffffff" metalness={0.95} roughness={0.05} />
                    </mesh>

                    {/* Inner detail */}
                    <mesh position={[0, 0.12, 0]}>
                        <cylinderGeometry args={[1.2, 1.2, 0.03, 6]} />
                        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
                    </mesh>

                    {/* Glow ring */}
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[2.1, 0.02, 16, 48]} />
                        <meshStandardMaterial
                            color="#ffffff"
                            transparent
                            opacity={0.5}
                            emissive="#ffffff"
                            emissiveIntensity={0.4}
                        />
                    </mesh>
                </group>
            </Float>
        </group>
    )
}

// ═══════════════════════════════════════════════════════════════
// AMBIENT PARTICLES
// ═══════════════════════════════════════════════════════════════
function LightParticles() {
    const pointsRef = useRef()

    const positions = useMemo(() => {
        const pos = new Float32Array(100 * 3)
        for (let i = 0; i < 100; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 45
            pos[i * 3 + 1] = (Math.random() - 0.5) * 22
            pos[i * 3 + 2] = -Math.random() * 55
        }
        return pos
    }, [])

    useFrame((state) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y = state.clock.elapsedTime * 0.008
        }
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={100} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.04} color="#ffffff" transparent opacity={0.45} />
        </points>
    )
}

// ═══════════════════════════════════════════════════════════════
// EFFECTS
// ═══════════════════════════════════════════════════════════════
function Effects() {
    return (
        <EffectComposer multisampling={0}>
            <Bloom intensity={0.22} luminanceThreshold={0.88} luminanceSmoothing={0.9} />
        </EffectComposer>
    )
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export default function Experience() {
    return (
        <div className="canvas-container">
            <Canvas
                camera={{ position: [0, 2, 15], fov: 50 }}
                dpr={1}
                gl={{ antialias: false, powerPreference: 'high-performance' }}
                performance={{ min: 0.5 }}
            >
                <color attach="background" args={['#0a0a0a']} />
                <fog attach="fog" args={['#0a0a0a', 15, 50]} />

                <Suspense fallback={null}>
                    <SmoothCamera />

                    {/* Lighting */}
                    <ambientLight intensity={0.3} />
                    <directionalLight position={[5, 10, 5]} intensity={1} />
                    <directionalLight position={[-5, 5, -5]} intensity={0.35} />

                    {/* Scenes */}
                    <MorphingSpheres />
                    <FlowingCubes />
                    <TorusRings />
                    <FinalToken />
                    <LightParticles />

                    <Effects />
                </Suspense>
            </Canvas>
        </div>
    )
}
