import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

// ─── Stylized 3D Character (girl with blue hair) ───
function Character({ posRef }: { posRef: React.MutableRefObject<THREE.Vector3> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const leftLegRef = useRef<THREE.Group>(null!);
  const rightLegRef = useRef<THREE.Group>(null!);
  const leftArmRef = useRef<THREE.Group>(null!);
  const rightArmRef = useRef<THREE.Group>(null!);
  const bodyBobRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Animation cycle: 8 seconds total
    const cycle = t % 8;
    let x: number, z: number;
    let facingRight = true;
    let isWalking = true;

    if (cycle < 2) {
      // Walk from center to left (competitor)
      const p = cycle / 2;
      x = THREE.MathUtils.lerp(0, -2.5, easeInOut(p));
      z = 0;
      facingRight = false;
    } else if (cycle < 3) {
      // Pause at competitor (picking up)
      x = -2.5;
      z = 0;
      isWalking = false;
      facingRight = false;
    } else if (cycle < 5.5) {
      // Walk from left to right (your brand)
      const p = (cycle - 3) / 2.5;
      x = THREE.MathUtils.lerp(-2.5, 2.5, easeInOut(p));
      z = 0;
      facingRight = true;
    } else if (cycle < 6.5) {
      // Pause at your brand (dropping off)
      x = 2.5;
      z = 0;
      isWalking = false;
    } else {
      // Walk back to center
      const p = (cycle - 6.5) / 1.5;
      x = THREE.MathUtils.lerp(2.5, 0, easeInOut(p));
      z = 0;
      facingRight = false;
    }

    groupRef.current.position.x = x;
    groupRef.current.position.z = z;
    posRef.current.set(x, 0, z);

    // Face direction
    groupRef.current.rotation.y = facingRight ? 0 : Math.PI;

    // Walking animation - legs and arms swing
    const walkSpeed = 8;
    const walkAmplitude = isWalking ? 0.4 : 0;

    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(t * walkSpeed) * walkAmplitude;
      rightLegRef.current.rotation.x = -Math.sin(t * walkSpeed) * walkAmplitude;
    }
    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = -Math.sin(t * walkSpeed) * walkAmplitude * 0.6;
      rightArmRef.current.rotation.x = Math.sin(t * walkSpeed) * walkAmplitude * 0.6;
    }

    // Body bob
    if (bodyBobRef.current) {
      bodyBobRef.current.position.y = isWalking ? Math.abs(Math.sin(t * walkSpeed)) * 0.08 : 0;
    }
  });

  const skinColor = "#c68642";
  const hairColor = "#5bc0eb";
  const dressColor = "#e8553a";

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group ref={bodyBobRef}>
        {/* Legs */}
        <group ref={leftLegRef} position={[-0.12, -0.05, 0]}>
          <mesh position={[0, -0.45, 0]}>
            <capsuleGeometry args={[0.06, 0.35, 8, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
          {/* Shoe */}
          <mesh position={[0, -0.7, 0.03]}>
            <boxGeometry args={[0.12, 0.08, 0.18]} />
            <meshStandardMaterial color="#333" roughness={0.4} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.12, -0.05, 0]}>
          <mesh position={[0, -0.45, 0]}>
            <capsuleGeometry args={[0.06, 0.35, 8, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.7, 0.03]}>
            <boxGeometry args={[0.12, 0.08, 0.18]} />
            <meshStandardMaterial color="#333" roughness={0.4} />
          </mesh>
        </group>

        {/* Torso / Dress */}
        <mesh position={[0, 0.25, 0]}>
          <capsuleGeometry args={[0.18, 0.3, 8, 16]} />
          <meshStandardMaterial color={dressColor} roughness={0.5} />
        </mesh>
        {/* Dress skirt */}
        <mesh position={[0, 0.02, 0]}>
          <coneGeometry args={[0.25, 0.3, 16]} />
          <meshStandardMaterial color={dressColor} roughness={0.5} />
        </mesh>

        {/* Arms */}
        <group ref={leftArmRef} position={[-0.25, 0.35, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.045, 0.25, 8, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.25, 0.35, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.045, 0.25, 8, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
        </group>

        {/* Head */}
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.06, 0.6, 0.16]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[-0.06, 0.6, 0.175]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0.06, 0.6, 0.16]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.06, 0.6, 0.175]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#333" />
        </mesh>

        {/* Blue Hair - multiple spheres for volume */}
        {[...Array(20)].map((_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const r = 0.15 + Math.random() * 0.08;
          const yOff = 0.65 + Math.random() * 0.15;
          return (
            <mesh key={`hair-${i}`} position={[
              Math.cos(angle) * r,
              yOff,
              Math.sin(angle) * r - 0.02
            ]}>
              <sphereGeometry args={[0.06 + Math.random() * 0.04, 8, 8]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>
          );
        })}
        {/* Hair top */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <mesh key={`hairtop-${i}`} position={[
              Math.cos(angle) * 0.08,
              0.82 + Math.random() * 0.06,
              Math.sin(angle) * 0.08
            ]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// ─── Wallet (3D open container) ───
function Wallet({ position, label, color, isTarget }: {
  position: [number, number, number];
  label: string;
  color: string;
  isTarget?: boolean;
}) {
  const walletColor = isTarget ? "#10b981" : "#94a3b8";
  const glowColor = isTarget ? "#34d399" : "#cbd5e1";

  return (
    <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.3}>
      <group position={position}>
        {/* Wallet base */}
        <RoundedBox args={[1.2, 0.6, 0.8]} radius={0.1} position={[0, -0.1, 0]}>
          <meshStandardMaterial
            color={walletColor}
            roughness={0.3}
            metalness={0.1}
            transparent
            opacity={0.85}
          />
        </RoundedBox>

        {/* Wallet back wall */}
        <RoundedBox args={[1.2, 0.8, 0.05]} radius={0.05} position={[0, 0.1, -0.38]}>
          <meshStandardMaterial color={walletColor} roughness={0.3} metalness={0.1} />
        </RoundedBox>

        {/* Inner glow */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[1.0, 0.02, 0.6]} />
          <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={0.3} transparent opacity={0.5} />
        </mesh>

        {/* Label */}
        <Text
          position={[0, -0.55, 0]}
          fontSize={0.1}
          color="#64748b"
          anchorX="center"
          anchorY="middle"
          font={undefined}
          letterSpacing={0.15}
        >
          {label.toUpperCase()}
        </Text>
      </group>
    </Float>
  );
}

// ─── User Avatar (small person icon sphere) ───
function UserAvatar({ index, charPos }: { index: number; charPos: React.MutableRefObject<THREE.Vector3> }) {
  const ref = useRef<THREE.Mesh>(null!);
  const offset = (index - 1) * 0.3;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const cycle = t % 8;

    let x: number, y: number, z: number;
    let visible = true;
    let scale = 1;

    if (cycle < 2) {
      // In competitor wallet, waiting
      x = -2.5 + offset * 0.5;
      y = 0.15;
      z = 0;
      // Pop up as character approaches
      const p = Math.min(1, cycle / 1.5);
      y = 0.15 + Math.sin(p * Math.PI) * 0.2;
    } else if (cycle < 3) {
      // Being picked up - follow character
      x = charPos.current.x + offset * 0.2;
      y = 1.0 + Math.sin(t * 3 + index) * 0.05;
      z = 0;
      scale = 0.8;
    } else if (cycle < 5.5) {
      // Carried by character
      x = charPos.current.x + offset * 0.2;
      y = 1.0 + Math.sin(t * 3 + index) * 0.05;
      z = 0;
      scale = 0.8;
    } else if (cycle < 6.5) {
      // Drop into your brand wallet
      const p = (cycle - 5.5) / 1;
      x = 2.5 + offset * 0.3;
      y = THREE.MathUtils.lerp(1.0, 0.15, easeInOut(p));
      z = 0;
      scale = THREE.MathUtils.lerp(0.8, 1, p);
    } else {
      // Fade out in your brand wallet, ready to reset
      const p = (cycle - 6.5) / 1.5;
      x = 2.5 + offset * 0.3;
      y = 0.15;
      z = 0;
      scale = THREE.MathUtils.lerp(1, 0, Math.max(0, (p - 0.5) * 2));
    }

    ref.current.position.set(x, y, z);
    ref.current.scale.setScalar(Math.max(0.01, scale));
    ref.current.visible = scale > 0.02;
  });

  return (
    <mesh ref={ref}>
      <group>
        {/* Head */}
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>
        {/* Body */}
        <mesh position={[0, -0.02, 0]}>
          <capsuleGeometry args={[0.05, 0.08, 8, 12]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
      </group>
    </mesh>
  );
}

// ─── Floating particles ───
function Particles() {
  const count = 30;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const speeds = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 6,
    y: Math.random() * 3 + 0.5,
    z: (Math.random() - 0.5) * 3,
    speed: 0.3 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
  })), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    speeds.forEach((s, i) => {
      dummy.position.set(
        s.x + Math.sin(t * s.speed + s.phase) * 0.5,
        s.y + Math.sin(t * s.speed * 0.7 + s.phase) * 0.3,
        s.z
      );
      dummy.scale.setScalar(0.02 + Math.sin(t + s.phase) * 0.01);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#34d399" transparent opacity={0.4} emissive="#34d399" emissiveIntensity={0.3} />
    </instancedMesh>
  );
}

// ─── Scene ───
function Scene() {
  const charPos = useRef(new THREE.Vector3());

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
      <directionalLight position={[-3, 5, -2]} intensity={0.3} color="#a7f3d0" />
      <pointLight position={[0, 3, 2]} intensity={0.5} color="#34d399" />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.8} transparent opacity={0.3} />
      </mesh>

      {/* Wallets */}
      <Wallet position={[-2.5, -0.3, 0]} label="Competitor Brand" color="#94a3b8" />
      <Wallet position={[2.5, -0.3, 0]} label="Your Brand" color="#10b981" isTarget />

      {/* Character */}
      <Character posRef={charPos} />

      {/* User avatars being transferred */}
      <UserAvatar index={0} charPos={charPos} />
      <UserAvatar index={1} charPos={charPos} />
      <UserAvatar index={2} charPos={charPos} />

      {/* Particles */}
      <Particles />
    </>
  );
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const MigrationAnimation = () => {
  return (
    <div className="relative w-full" style={{ height: "500px" }}>
      <Canvas
        camera={{ position: [0, 2, 6], fov: 40 }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene />
      </Canvas>
      {/* Caption overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="rounded-2xl bg-background/80 backdrop-blur-sm border border-border px-6 py-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse" />
            Migrating customers in real-time
          </p>
        </div>
      </div>
    </div>
  );
};

export default MigrationAnimation;
