import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  PerspectiveCamera,
  OrbitControls,
  Float,
  MeshDistortMaterial,
  GradientTexture,
  Html,
  RoundedBox
} from "@react-three/drei";
import * as THREE from "three";
import { User } from "lucide-react";

// --- Materials ---
const clayMaterial = {
  roughness: 0.8,
  metalness: 0.1,
  emissiveIntensity: 0.1,
};

const Character = ({ position, rotation, personaCount, isWalking }: any) => {
  const group = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (isWalking) {
      // Walking animation
      if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(t * 10) * 0.5;
      if (rightLeg.current) rightLeg.current.rotation.x = Math.sin(t * 10 + Math.PI) * 0.5;
      if (leftArm.current) leftArm.current.rotation.x = Math.sin(t * 10 + Math.PI) * 0.4;
      if (rightArm.current) rightArm.current.rotation.x = Math.sin(t * 10) * 0.4;
      if (bodyRef.current) bodyRef.current.position.y = Math.abs(Math.sin(t * 10)) * 0.05;
    } else {
      // Idle animation
      if (leftLeg.current) leftLeg.current.rotation.x = 0;
      if (rightLeg.current) rightLeg.current.rotation.x = 0;
      if (leftArm.current) leftArm.current.rotation.x = Math.sin(t * 2) * 0.1;
      if (rightArm.current) rightArm.current.rotation.x = Math.sin(t * 2 + Math.PI) * 0.1;
      if (bodyRef.current) bodyRef.current.position.y = Math.sin(t * 2) * 0.02;
    }

    if (group.current) {
      group.current.position.y = Math.sin(t * 2) * 0.05;
    }
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      <group ref={bodyRef}>
      {/* Body / Hoodie - Purple */}
      <RoundedBox args={[0.6, 0.8, 0.4]} radius={0.15} smoothness={4}>
        <meshStandardMaterial color="#8B5CF6" {...clayMaterial} />
      </RoundedBox>

      {/* Head - Skin Tone */}
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#FFD1BA" {...clayMaterial} />
      </mesh>

      {/* Hair / Hoodie Cap */}
      <mesh position={[0, 0.7, -0.05]}>
        <sphereGeometry args={[0.26, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color="#8B5CF6" {...clayMaterial} />
      </mesh>

      {/* Eyes / Glasses */}
      <group position={[0, 0.65, 0.2]}>
        {/* Left Lens */}
        <mesh position={[-0.08, 0, 0]}>
          <circleGeometry args={[0.05, 32]} />
          <meshStandardMaterial color="#333" transparent opacity={0.8} />
        </mesh>
        {/* Right Lens */}
        <mesh position={[0.08, 0, 0]}>
          <circleGeometry args={[0.05, 32]} />
          <meshStandardMaterial color="#333" transparent opacity={0.8} />
        </mesh>
        {/* Frame */}
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[0.25, 0.02, 0.01]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>

      {/* Arms */}
      <mesh ref={leftArm} position={[-0.35, 0.1, 0]}>
        <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
        <meshStandardMaterial color="#8B5CF6" {...clayMaterial} />
      </mesh>
      <mesh ref={rightArm} position={[0.35, 0.1, 0]}>
        <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
        <meshStandardMaterial color="#8B5CF6" {...clayMaterial} />
      </mesh>

      {/* Legs */}
      <mesh ref={leftLeg} position={[-0.15, -0.5, 0]}>
        <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
        <meshStandardMaterial color="#4B5563" {...clayMaterial} />
      </mesh>
      <mesh ref={rightLeg} position={[0.15, -0.5, 0]}>
        <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
        <meshStandardMaterial color="#4B5563" {...clayMaterial} />
      </mesh>

        {/* Carrying Personas */}
        {personaCount > 0 && (
          <group position={[0, 0.2, 0.35]}>
            <Persona scale={0.4} />
          </group>
        )}
      </group>
    </group>
  );
};

const Persona = ({ position = [0, 0, 0], scale = 1 }: any) => {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color="white" roughness={0.3} metalness={0.2} />
      </mesh>
      <Html center transform distanceFactor={1.5} position={[0, 0, 0.21]}>
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <User className="h-2 w-2 text-emerald-500" />
        </div>
      </Html>
    </group>
  );
};

const Wallet = ({ position, label, isTarget = false }: any) => {
  return (
    <group position={position}>
      <RoundedBox args={[1.5, 0.2, 1]} radius={0.1} smoothness={4} position={[0, -0.5, 0]}>
        <meshStandardMaterial
          color={isTarget ? "#10b981" : "#ffffff"}
          transparent
          opacity={isTarget ? 0.3 : 0.1}
          {...clayMaterial}
        />
      </RoundedBox>
      <RoundedBox args={[1.5, 0.8, 0.1]} radius={0.1} smoothness={4} position={[0, -0.2, -0.45]}>
        <meshStandardMaterial
          color={isTarget ? "#10b981" : "#ffffff"}
          transparent
          opacity={isTarget ? 0.2 : 0.05}
          {...clayMaterial}
        />
      </RoundedBox>
      <Html position={[0, -0.8, 0]} center>
        <div className="w-32 text-center">
          <span className="text-[10px] font-black tracking-[0.2em] text-foreground/50 uppercase">
            {label}
          </span>
        </div>
      </Html>
    </group>
  );
};

const MigrationScene = () => {
  const characterRef = useRef<THREE.Group>(null);
  const [isWalking, setIsWalking] = useState(false);
  const [personaInHand, setPersonaInHand] = useState(0);
  const [sourcePersonas, setSourcePersonas] = useState(3);
  const [targetPersonas, setTargetPersonas] = useState(0);

  const stateRef = useRef({
    phase: 'pickup',
    timer: 0,
    x: -2,
    rotation: Math.PI / 2
  });

  useFrame((state, delta) => {
    const s = stateRef.current;
    const char = characterRef.current;
    if (!char) return;

    s.timer += delta;

    if (s.phase === 'pickup') {
      if (s.timer > 1.5) {
        setPersonaInHand(1);
        setSourcePersonas(prev => prev === 0 ? 5 : prev - 1); // Refill if empty for loop
        s.phase = 'walking-to-target';
        s.timer = 0;
        setIsWalking(true);
        s.rotation = Math.PI / 2;
      }
    } else if (s.phase === 'walking-to-target') {
      const progress = Math.min(s.timer / 2.5, 1);
      s.x = -2 + progress * 4;
      if (progress >= 1) {
        s.phase = 'dropoff';
        s.timer = 0;
        setIsWalking(false);
      }
    } else if (s.phase === 'dropoff') {
      if (s.timer > 1.5) {
        setPersonaInHand(0);
        setTargetPersonas(prev => (prev + 1) % 10);
        s.phase = 'walking-to-source';
        s.timer = 0;
        setIsWalking(true);
        s.rotation = -Math.PI / 2;
      }
    } else if (s.phase === 'walking-to-source') {
      const progress = Math.min(s.timer / 2.5, 1);
      s.x = 2 - progress * 4;
      if (progress >= 1) {
        s.phase = 'pickup';
        s.timer = 0;
        setIsWalking(false);
        s.rotation = Math.PI / 2;
      }
    }

    char.position.x = s.x;
    char.rotation.y = THREE.MathUtils.lerp(char.rotation.y, s.rotation, 0.1);
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />

      <Wallet position={[-2, 0, 0]} label="Competitor Brand" />
      <Wallet position={[2, 0, 0]} label="Your Brand" isTarget />

      <group ref={characterRef} position={[-2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Character
          personaCount={personaInHand}
          isWalking={isWalking}
        />
      </group>

      {/* Source Personas */}
      {Array.from({ length: sourcePersonas }).map((_, i) => (
        <Persona key={`src-${i}`} position={[-2, -0.3, i * 0.2 - 0.2]} scale={0.4} />
      ))}

      {/* Target Personas */}
      {Array.from({ length: targetPersonas }).map((_, i) => (
        <Persona key={`target-${i}`} position={[2, -0.3, i * 0.2 - 0.2]} scale={0.4} />
      ))}
    </>
  );
};

const Migration3D = () => {
  return (
    <div className="h-[450px] md:h-[550px] w-full relative">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 1, 5]} fov={40} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
        />

        <MigrationScene />

        {/* Floating background elements */}
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <mesh position={[-4, 2, -2]}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <MeshDistortMaterial color="#10b981" speed={2} distort={0.4} radius={1} />
          </mesh>
        </Float>
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 px-8 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.1)] clay-shadow">
          <p className="text-sm font-bold text-foreground/90 flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(var(--primary),0.5)]" />
            Migrating customers in real-time
          </p>
        </div>
      </div>
    </div>
  );
};

export default Migration3D;
