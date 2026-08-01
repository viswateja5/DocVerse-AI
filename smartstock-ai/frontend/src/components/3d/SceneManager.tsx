import { Suspense, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'
import { useLocation } from 'react-router-dom'
import * as THREE from 'three'
import { Warehouse } from './Warehouse'
import { Forklift } from './Forklift'
import { Particles } from './Particles'
import { MouseParallax } from './MouseParallax'

function CameraManager() {
  const location = useLocation()
  const { camera } = useThree()
  
  // Target coordinates for different routes
  const [targetPos] = useState(() => new THREE.Vector3(0, 5, 15))
  const [targetLookAt] = useState(() => new THREE.Vector3(0, 0, 0))
  const [currentLookAt] = useState(() => new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    switch (location.pathname) {
      case '/inventory':
        targetPos.set(-4, 3, 8)
        targetLookAt.set(-2, 0, 0)
        break
      case '/forecast':
        targetPos.set(6, 6, 12)
        targetLookAt.set(2, 0, -2)
        break
      case '/settings':
        targetPos.set(0, 12, 4)
        targetLookAt.set(0, 0, 0)
        break
      default:
        targetPos.set(0, 5, 15)
        targetLookAt.set(0, 0, 0)
        break
    }
  }, [location.pathname, targetPos, targetLookAt])

  useFrame((state, delta) => {
    // Smoothly interpolate camera position
    camera.position.lerp(targetPos, 2 * delta)
    // Smoothly interpolate camera lookAt
    currentLookAt.lerp(targetLookAt, 2 * delta)
    camera.lookAt(currentLookAt)
  })

  return null
}

export function SceneManager() {
  const [performanceMode, setPerformanceMode] = useState<'high' | 'low'>('high')

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none opacity-50 dark:opacity-40 transition-opacity duration-1000">
      <Canvas shadows={performanceMode === 'high'} camera={{ position: [0, 5, 15], fov: 45 }}>
        <CameraManager />
        <color attach="background" args={['#0a0a0a']} />
        
        {/* Adds depth fading to the background so things don't suddenly clip out */}
        <fog attach="fog" args={['#0a0a0a', 10, 40]} />
        
        <PerformanceMonitor 
          onDecline={() => setPerformanceMode('low')} 
          onIncline={() => setPerformanceMode('high')}
        />

        <ambientLight intensity={0.2} />
        <spotLight 
          position={[0, 15, 0]} 
          intensity={performanceMode === 'high' ? 1.5 : 0.8}
          angle={0.6} 
          penumbra={1} 
          castShadow={performanceMode === 'high'}
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[5, 5, 5]} intensity={0.5} color="#4f46e5" />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ec4899" />

        <Suspense fallback={null}>
          <Warehouse performanceMode={performanceMode} />
          <Forklift />
          <Particles count={performanceMode === 'high' ? 500 : 100} />
          
          <MouseParallax intensity={2} />
          
          {/* Post Processing only enabled on high perf devices to save battery/FPS */}
          {performanceMode === 'high' && (
            <EffectComposer>
              <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} />
              <DepthOfField focusDistance={0.05} focalLength={0.1} bokehScale={2} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  )
}
