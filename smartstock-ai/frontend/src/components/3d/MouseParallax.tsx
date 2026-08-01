import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function MouseParallax({ intensity = 1.5 }) {
  const target = new THREE.Vector3()

  useFrame((state) => {
    // Calculate target position based on mouse position
    // Default camera is at [0, 5, 15] looking at [0,0,0]
    target.x = (state.pointer.x * intensity)
    target.y = 5 + (state.pointer.y * intensity * 0.5)
    target.z = 15
    
    // Smoothly interpolate camera position to target
    state.camera.position.lerp(target, 0.05)
    state.camera.lookAt(0, 2, 0)
  })

  return null
}
