import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Particles({ count = 500 }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  
  // Create random positions and speeds for the particles
  const dummy = new THREE.Object3D()
  const particles = new Float32Array(count * 3)
  const speeds = new Float32Array(count)
  
  for (let i = 0; i < count; i++) {
    particles[i * 3 + 0] = (Math.random() - 0.5) * 40
    particles[i * 3 + 1] = Math.random() * 20
    particles[i * 3 + 2] = (Math.random() - 0.5) * 40
    speeds[i] = 0.01 + Math.random() * 0.02
  }

  useFrame((state) => {
    if (!mesh.current) return
    
    const time = state.clock.elapsedTime
    
    for (let i = 0; i < count; i++) {
      const x = particles[i * 3 + 0]
      const y = particles[i * 3 + 1] + Math.sin(time * speeds[i] + i) * 2
      const z = particles[i * 3 + 2]
      
      dummy.position.set(x, y, z)
      
      // Twinkle effect scale
      const scale = 0.05 + Math.sin(time * speeds[i] * 5 + i) * 0.03
      dummy.scale.set(scale, scale, scale)
      
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#6366f1" transparent opacity={0.4} />
    </instancedMesh>
  )
}
