import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Box } from '@react-three/drei'

export function Warehouse({ performanceMode = 'high' }) {
  const boxCount = 100
  const boxesRef = useRef<THREE.InstancedMesh>(null)
  
  // Create layout for shelves and boxes
  const boxPositions = useMemo(() => {
    const positions = []
    for (let i = 0; i < boxCount; i++) {
      const aisle = i % 2 === 0 ? -4 : 4
      const x = aisle + (Math.random() - 0.5) * 1.5
      const y = 0.5 + Math.floor(Math.random() * 4) * 1.5 // shelf levels
      const z = (Math.random() - 0.5) * 30
      positions.push(new THREE.Vector3(x, y, z))
    }
    return positions
  }, [boxCount])

  useFrame((state) => {
    if (!boxesRef.current) return
    const dummy = new THREE.Object3D()
    const t = state.clock.elapsedTime
    
    boxPositions.forEach((pos, i) => {
      // Gentle floating/pulsing effect for the boxes (AI vibe)
      const offset = Math.sin(t * 2 + i) * 0.1
      dummy.position.set(pos.x, pos.y + offset, pos.z)
      dummy.rotation.set(0, t * 0.2 + i, 0)
      dummy.updateMatrix()
      boxesRef.current!.setMatrixAt(i, dummy.matrix)
    })
    boxesRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      {/* Glowing Floor Grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#09090b" depthWrite={true} />
        <gridHelper args={[100, 50, '#3f3f46', '#27272a']} rotation={[Math.PI/2, 0, 0]} position={[0, 0, 0.02]} />
      </mesh>

      {/* Shelving structure (simplified) */}
      <Box args={[2, 6, 35]} position={[-4, 3, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#18181b" transparent opacity={0.8} />
      </Box>
      <Box args={[2, 6, 35]} position={[4, 3, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#18181b" transparent opacity={0.8} />
      </Box>

      {/* Instanced Boxes */}
      <instancedMesh ref={boxesRef} args={[undefined, undefined, boxCount]} castShadow={performanceMode === 'high'}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#818cf8" emissive="#4f46e5" emissiveIntensity={0.2} />
      </instancedMesh>
    </group>
  )
}
