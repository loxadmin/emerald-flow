import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Text, MeshDistortMaterial, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

// ─── Character component (Adapted from MigrationAnimation.tsx) ───
function Character({ posRef }: { posRef: React.MutableRefObject<THREE.Vector3> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const leftLegRef = useRef<THREE.Group>(null!);
  const rightLegRef = useRef<THREE.Group>(null!);
  const leftArmRef = useRef<THREE.Group>(null!);
  const rightArmRef = useRef<THREE.Group>(null!);
  const bodyBobRef = useRef<THREE.Group>(null!);
  const stateRef = useRef({ isWalking: false, facingRight: true });

  useEffect(() => {
    if (!groupRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1 });

      // Initial state
      gsap.set(groupRef.current.position, { x: -3 });
      gsap.set(groupRef.current.rotation, { y: Math.PI / 2 });

      tl.to(groupRef.current.position, {
        x: 3,
        duration: 4,
        ease: "power1.inOut",
        onStart: () => { stateRef.current.isWalking = true; stateRef.current.facingRight = true; },
        onComplete: () => { stateRef.current.isWalking = false; }
      })
      .to({}, { duration: 1 }) // Wait at brand
      .to(groupRef.current.rotation, {
        y: -Math.PI / 2,
        duration: 0.5,
        ease: "back.inOut(2)"
      })
      .to(groupRef.current.position, {
        x: -3,
        duration: 4,
        ease: "power1.inOut",
        onStart: () => { stateRef.current.isWalking = true; stateRef.current.facingRight = false; },
        onComplete: () => { stateRef.current.isWalking = false; }
      })
      .to({}, { duration: 1 }) // Wait at competitor
      .to(groupRef.current.rotation, {
        y: Math.PI / 2,
        duration: 0.5,
        ease: "back.inOut(2)"
      });
    });

    return () => ctx.revert();
  }, []);

  const hairStrands = useMemo(() => {
    const strands: { x: number; y: number; z: number; r: number }[] = [];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const height = 0.4 + Math.random() * 0.45;
      const radius = 0.18 + Math.random() * 0.12;
      strands.push({
        x: Math.cos(angle) * radius,
        y: height,
        z: Math.sin(angle) * radius,
        r: 0.04 + Math.random() * 0.04,
      });
    }
    return strands;
  }, []);

  const topHair = useMemo(() => {
    const tops: { x: number; y: number; z: number; r: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.18;
      tops.push({
        x: Math.cos(angle) * radius,
        y: 0.8 + Math.random() * 0.1,
        z: Math.sin(angle) * radius,
        r: 0.05 + Math.random() * 0.03,
      });
    }
    return tops;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const { isWalking } = stateRef.current;

    posRef.current.copy(groupRef.current.position);

    const walkSpeed = 12;
    const walkAmp = isWalking ? 0.6 : 0;

    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(t * walkSpeed) * walkAmp;
      rightLegRef.current.rotation.x = -Math.sin(t * walkSpeed) * walkAmp;
    }
    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = -Math.sin(t * walkSpeed) * walkAmp * 0.7;
      rightArmRef.current.rotation.x = Math.sin(t * walkSpeed) * walkAmp * 0.7;
    }
    if (bodyBobRef.current) {
      bodyBobRef.current.position.y = isWalking ? Math.abs(Math.sin(t * walkSpeed)) * 0.1 : 0;
    }
  });

  const skinColor = "#6B4226";
  const hairColor = "#9BD8F2";
  const sweaterColor = "#E85D3A";

  return (
    <group ref={groupRef} position={[0, 0.5, 0]} scale={0.7}>
      <group ref={bodyBobRef}>
        {/* Legs */}
        <group ref={leftLegRef} position={[-0.1, -0.05, 0]}>
          <mesh position={[0, -0.4, 0]}>
            <capsuleGeometry args={[0.06, 0.3, 8, 16]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.1, -0.05, 0]}>
          <mesh position={[0, -0.4, 0]}>
            <capsuleGeometry args={[0.06, 0.3, 8, 16]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
        </group>
        {/* Torso */}
        <mesh position={[0, 0.22, 0]}>
          <capsuleGeometry args={[0.18, 0.3, 8, 16]} />
          <meshStandardMaterial color={sweaterColor} />
        </mesh>
        {/* Arms */}
        <group ref={leftArmRef} position={[-0.22, 0.32, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.05, 0.2, 8, 16]} />
            <meshStandardMaterial color={sweaterColor} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.22, 0.32, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.05, 0.2, 8, 16]} />
            <meshStandardMaterial color={sweaterColor} />
          </mesh>
        </group>
        {/* Head */}
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        {/* Hair */}
        {hairStrands.map((h, i) => (
          <mesh key={`hair-${i}`} position={[h.x, h.y, h.z]}>
            <sphereGeometry args={[h.r, 8, 8]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
        ))}
        {topHair.map((h, i) => (
          <mesh key={`ht-${i}`} position={[h.x, h.y, h.z]}>
            <sphereGeometry args={[h.r, 8, 8]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ─── Procedural Tree component ───
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const meshRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.rotation.z = Math.sin(t * 1.5 + position[0]) * 0.05;
      meshRef.current.rotation.x = Math.cos(t * 1.2 + position[2]) * 0.03;
    }
  });

  return (
    <group position={position} scale={scale} ref={meshRef}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 1, 8]} />
        <meshStandardMaterial color="#4d3220" />
      </mesh>
      {/* Foliage */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshStandardMaterial color="#22c55e" roughness={0.8} />
        </mesh>
        <mesh position={[0.2, 1.5, 0.1]}>
          <sphereGeometry args={[0.4, 12, 12]} />
          <meshStandardMaterial color="#16a34a" roughness={0.8} />
        </mesh>
        <mesh position={[-0.2, 1.4, -0.1]}>
          <sphereGeometry args={[0.45, 12, 12]} />
          <meshStandardMaterial color="#15803d" roughness={0.8} />
        </mesh>
      </Float>
    </group>
  );
}

// ─── Flowing Water component ───
function Water() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
      <planeGeometry args={[20, 10, 32, 32]} />
      <MeshDistortMaterial
        color="#22c55e"
        speed={2}
        distort={0.4}
        radius={1}
        opacity={0.6}
        transparent
        metalness={0.5}
        roughness={0.2}
      />
    </mesh>
  );
}

// ─── Bridge/Platform component ───
function Bridge() {
  return (
    <group position={[0, -0.1, 0]}>
      {/* Main Bridge Path */}
      <RoundedBox args={[10, 0.2, 2]} radius={0.05} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1a2e25" />
      </RoundedBox>
      {/* Pillars */}
      <mesh position={[-4, -0.5, 0]}>
        <boxGeometry args={[0.4, 1, 1.8]} />
        <meshStandardMaterial color="#0d1612" />
      </mesh>
      <mesh position={[4, -0.5, 0]}>
        <boxGeometry args={[0.4, 1, 1.8]} />
        <meshStandardMaterial color="#0d1612" />
      </mesh>
    </group>
  );
}

function Marker({ position, label, color }: { position: [number, number, number]; label: string; color: string }) {
  return (
    <group position={position}>
      <Float speed={3} rotationIntensity={0.1} floatIntensity={0.3}>
        <RoundedBox args={[1.5, 0.8, 0.1]} radius={0.1} position={[0, 1, 0]}>
          <meshStandardMaterial color={color} />
        </RoundedBox>
        <Text
          position={[0, 1, 0.06]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.2}
          textAlign="center"
          font="https://fonts.gstatic.com/s/plusjakartasans/v8/L0xPDFNoR8nv3a2W636EYKrr7_S4.woff"
        >
          {label}
        </Text>
      </Float>
      {/* Base */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>
    </group>
  );
}

function Scene() {
  const charPos = useRef(new THREE.Vector3());

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 4, 10]} fov={40} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <directionalLight position={[-5, 5, 5]} intensity={0.8} />

      <color attach="background" args={["#0d1612"]} />

      {/* Scenery */}
      <Water />
      <Bridge />

      {/* Markers */}
      <Marker position={[-3.5, 0, 0.8]} label="Competitor Brand" color="#334155" />
      <Marker position={[3.5, 0, 0.8]} label="Karbali (Your Brand)" color="#22c55e" />

      {/* Trees */}
      <Tree position={[-6, -0.2, -2]} scale={1.2} />
      <Tree position={[-5, -0.2, -3]} scale={0.8} />
      <Tree position={[6, -0.2, -2.5]} scale={1.1} />
      <Tree position={[5, -0.2, -3.5]} scale={0.9} />
      <Tree position={[0, -0.2, -4]} scale={1.3} />

      {/* Character */}
      <Character posRef={charPos} />

      <ContactShadows
        position={[0, -0.39, 0]}
        opacity={0.4}
        scale={20}
        blur={2}
        far={4.5}
      />
    </>
  );
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const LushLandscape = () => {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default LushLandscape;
