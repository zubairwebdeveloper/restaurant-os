"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { MathUtils } from "three";

const C = { gold: "#B9975B", olive: "#66745A", sand: "#D8C8AC", charcoal: "#292D29", ivory: "#F5F0E6" };

function Table() {
  const group = useRef();

  useFrame((state, delta) => {
    if (!group.current) return;
    const { x, y } = state.pointer;
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, x * 0.5 + state.clock.elapsedTime * 0.08, 3, delta);
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, 0.35 - y * 0.2, 3, delta);
  });

  return (
    <group ref={group} scale={1.05}>
      {/* plate */}
      <mesh>
        <cylinderGeometry args={[1.7, 1.5, 0.09, 64]} />
        <meshStandardMaterial color={C.ivory} roughness={0.35} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.04, 64]} />
        <meshStandardMaterial color={C.charcoal} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.45, 0.018, 16, 96]} />
        <meshStandardMaterial color={C.gold} metalness={0.9} roughness={0.25} />
      </mesh>

      {/* food */}
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.6}>
        <mesh position={[0.1, 0.5, 0]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.5, 48, 48]} />
          <meshStandardMaterial color={C.gold} roughness={0.4} metalness={0.35} />
        </mesh>
      </Float>
      <Float speed={2.6} floatIntensity={0.9}>
        <mesh position={[-0.75, 0.55, 0.35]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial color={C.olive} roughness={0.5} />
        </mesh>
      </Float>
      <Float speed={2.2} floatIntensity={0.8}>
        <mesh position={[0.8, 0.6, -0.35]}>
          <sphereGeometry args={[0.17, 32, 32]} />
          <meshStandardMaterial color={C.olive} roughness={0.5} />
        </mesh>
      </Float>
      <Float speed={1.8} floatIntensity={1}>
        <mesh position={[0.55, 0.7, 0.75]} scale={[1.4, 1, 1]}>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial color={C.sand} roughness={0.55} />
        </mesh>
      </Float>
      {[
        [-1.1, 1.3, -0.4, 0.07],
        [1.2, 1.1, 0.5, 0.05],
        [0.2, 1.7, 0.9, 0.06],
        [-0.4, 1.6, -0.9, 0.045],
      ].map(([x, y, z, r], i) => (
        <Float key={i} speed={1.5 + i * 0.3} floatIntensity={1.5}>
          <mesh position={[x, y, z]}>
            <sphereGeometry args={[r, 20, 20]} />
            <meshStandardMaterial color={C.gold} metalness={0.9} roughness={0.2} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.4, 5.4], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#F5E3C0" />
      <pointLight position={[-4, 1, 2]} intensity={14} color="#B9975B" />
      <pointLight position={[3, -2, -3]} intensity={8} color="#66745A" />
      <Table />
    </Canvas>
  );
}
