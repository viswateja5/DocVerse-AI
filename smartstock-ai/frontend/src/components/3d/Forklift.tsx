import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Box } from '@react-three/drei'

export function Forklift() {
  const group = useRef<THREE.Group>(null)
  
  // Animation loop
  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.getElapsedTime()
    // Move back and forth along the Z axis
    group.current.position.z = Math.sin(t * 0.5) * 15
  })

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Forklift Body */}
      <Box args={[1.5, 1.2, 2.5]} position={[0, 0.6, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#fbbf24" />
      </Box>
      {/* Cabin */}
      <Box args={[1.2, 1, 1.5]} position={[0, 1.7, -0.2]} castShadow receiveShadow>
        <meshStandardMaterial color="#1f2937" />
      </Box>
      {/* Forks */}
      <Box args={[0.2, 2, 0.1]} position={[-0.4, 1, 1.3]} castShadow>
        <meshStandardMaterial color="#374151" />
      </Box>
      <Box args={[0.2, 2, 0.1]} position={[0.4, 1, 1.3]} castShadow>
        <meshStandardMaterial color="#374151" />
      </Box>
      <Box args={[0.2, 0.05, 1.5]} position={[-0.4, 0.1, 2]} castShadow>
        <meshStandardMaterial color="#374151" />
      </Box>
      <Box args={[0.2, 0.05, 1.5]} position={[0.4, 0.1, 2]} castShadow>
        <meshStandardMaterial color="#374151" />
      </Box>
      
      {/* Animated Pallet on Forks */}
      <group position={[0, 0.2, 1.8]}>
        <Box args={[1.2, 0.15, 1.2]} castShadow>
          <meshStandardMaterial color="#b45309" />
        </Box>
        <Box args={[1, 1, 1]} position={[0, 0.6, 0]} castShadow>
          <meshStandardMaterial color="#ec4899" />
        </Box>
      </group>
    </group>
  )
}
