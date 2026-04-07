import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

// ─── Stylized 3D Character inspired by reference ───
function Character({ posRef }: { posRef: React.MutableRefObject<THREE.Vector3> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const leftLegRef = useRef<THREE.Group>(null!);
  const rightLegRef = useRef<THREE.Group>(null!);
  const leftArmRef = useRef<THREE.Group>(null!);
  const rightArmRef = useRef<THREE.Group>(null!);
  const bodyBobRef = useRef<THREE.Group>(null!);

  // Pre-compute hair positions to avoid random on each render
  const hairStrands = useMemo(() => {
    const strands: { x: number; y: number; z: number; r: number }[] = [];
    // Much denser and more randomized hair for "frizzy" look
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
    const cycle = t % 10;
    let x: number;
    let facingRight = true;
    let isWalking = true;
    let bendDown = 0; // for dipping into wallet

    if (cycle < 2.5) {
      // Walk to competitor wallet
      const p = cycle / 2.5;
      x = THREE.MathUtils.lerp(0, -2.2, easeInOut(p));
      facingRight = false;
    } else if (cycle < 4) {
      // Bend down and dip into wallet
      x = -2.2;
      isWalking = false;
      facingRight = false;
      const p = (cycle - 2.5) / 1.5;
      bendDown = Math.sin(p * Math.PI) * 0.45;
    } else if (cycle < 7) {
      // Walk to your brand wallet
      const p = (cycle - 4) / 3;
      x = THREE.MathUtils.lerp(-2.2, 2.2, easeInOut(p));
      facingRight = true;
    } else if (cycle < 8.5) {
      // Bend down and drop into wallet
      x = 2.2;
      isWalking = false;
      bendDown = Math.sin(((cycle - 7) / 1.5) * Math.PI) * 0.45;
    } else {
      // Walk back to center
      const p = (cycle - 8.5) / 1.5;
      x = THREE.MathUtils.lerp(2.2, 0, easeInOut(p));
      facingRight = false;
    }

    groupRef.current.position.x = x;
    posRef.current.set(x, 0, 0);
    groupRef.current.rotation.y = facingRight ? 0 : Math.PI;

    const walkSpeed = 8;
    const walkAmp = isWalking ? 0.4 : 0;

    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(t * walkSpeed) * walkAmp;
      rightLegRef.current.rotation.x = -Math.sin(t * walkSpeed) * walkAmp;
    }
    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = -Math.sin(t * walkSpeed) * walkAmp * 0.6 - bendDown * 2.5;
      rightArmRef.current.rotation.x = Math.sin(t * walkSpeed) * walkAmp * 0.6 - bendDown * 2.5;
    }
    if (bodyBobRef.current) {
      bodyBobRef.current.position.y = isWalking
        ? Math.abs(Math.sin(t * walkSpeed)) * 0.06
        : 0;
      bodyBobRef.current.rotation.x = bendDown;
    }
  });

  const skinColor = "#6B4226";
  const noseColor = "#FF8A8A";
  const hairColor = "#9BD8F2";
  const sweaterColor = "#E85D3A";
  const patternBlue = "#3B7DD8";
  const patternYellow = "#E8C63A";

  return (
    <group ref={groupRef} position={[0, 0.1, 0]} scale={0.9}>
      <group ref={bodyBobRef}>
        {/* Legs */}
        <group ref={leftLegRef} position={[-0.1, -0.05, 0]}>
          <mesh position={[0, -0.4, 0]}>
            <capsuleGeometry args={[0.055, 0.3, 8, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.62, 0.02]}>
            <boxGeometry args={[0.11, 0.07, 0.16]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.4} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.1, -0.05, 0]}>
          <mesh position={[0, -0.4, 0]}>
            <capsuleGeometry args={[0.055, 0.3, 8, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.62, 0.02]}>
            <boxGeometry args={[0.11, 0.07, 0.16]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.4} />
          </mesh>
        </group>

        {/* Torso / Sweater with dots pattern */}
        <mesh position={[0, 0.22, 0]}>
          <capsuleGeometry args={[0.17, 0.28, 8, 16]} />
          <meshStandardMaterial color={sweaterColor} roughness={0.8} />
        </mesh>
        {/* Sweater collar */}
        <mesh position={[0, 0.42, 0]}>
          <torusGeometry args={[0.12, 0.03, 8, 16]} />
          <meshStandardMaterial color={sweaterColor} roughness={0.8} />
        </mesh>
        {/* Flower pattern on sweater */}
        {[
          [-0.08, 0.22, 0.15],
          [0.08, 0.15, 0.15],
          [0, 0.3, 0.15],
          [-0.1, 0.08, 0.12],
          [0.1, 0.08, 0.12]
        ].map((center, i) => (
          <group key={`flower-${i}`} position={center as [number, number, number]} scale={0.4}>
            {/* Flower center */}
            <mesh>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial color={patternYellow} roughness={0.7} />
            </mesh>
            {/* Petals */}
            {[0, 1, 2, 3, 4].map((p) => {
              const angle = (p / 5) * Math.PI * 2;
              return (
                <mesh key={`petal-${p}`} position={[Math.cos(angle) * 0.08, Math.sin(angle) * 0.08, 0]}>
                  <sphereGeometry args={[0.05, 8, 8]} />
                  <meshStandardMaterial color={patternBlue} roughness={0.7} />
                </mesh>
              );
            })}
          </group>
        ))}

        {/* Arms */}
        <group ref={leftArmRef} position={[-0.22, 0.32, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.04, 0.22, 8, 16]} />
            <meshStandardMaterial color={sweaterColor} roughness={0.8} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.3, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.22, 0.32, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.04, 0.22, 8, 16]} />
            <meshStandardMaterial color={sweaterColor} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
        </group>

        {/* Head */}
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>

        {/* Eyes - droopy/sleepy like reference */}
        {/* Left eye */}
        <mesh position={[-0.055, 0.54, 0.14]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[-0.055, 0.535, 0.165]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color="#2a1a0a" />
        </mesh>
        {/* Left eyelid (droopy) */}
        <mesh position={[-0.055, 0.565, 0.155]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.08, 0.025, 0.03]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>
        {/* Right eye */}
        <mesh position={[0.055, 0.54, 0.14]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.055, 0.535, 0.165]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color="#2a1a0a" />
        </mesh>
        <mesh position={[0.055, 0.565, 0.155]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.08, 0.025, 0.03]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>

        {/* Nose - round like reference */}
        <mesh position={[0, 0.5, 0.16]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={noseColor} roughness={0.6} />
        </mesh>

        {/* Mouth - slight frown */}
        <mesh position={[0, 0.46, 0.14]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.025, 0.006, 8, 12, Math.PI]} />
          <meshStandardMaterial color="#6B3A2A" />
        </mesh>

        {/* Blue fluffy hair - big volume drooping down */}
        {hairStrands.map((h, i) => (
          <mesh key={`hair-${i}`} position={[h.x, h.y, h.z]}>
            <sphereGeometry args={[h.r, 8, 8]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
        ))}
        {topHair.map((h, i) => (
          <mesh key={`ht-${i}`} position={[h.x, h.y, h.z]}>
            <sphereGeometry args={[h.r, 8, 8]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
        ))}
        {/* Hair fringe covering forehead */}
        {[...Array(6)].map((_, i) => {
          const xp = -0.12 + (i / 5) * 0.24;
          return (
            <mesh key={`fringe-${i}`} position={[xp, 0.63, 0.13]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// ─── 3D Wallet ───
function Wallet({ position, label, isTarget }: {
  position: [number, number, number];
  label: string;
  isTarget?: boolean;
}) {
  const color = isTarget ? "#10b981" : "#64748b";
  const innerColor = isTarget ? "#34d399" : "#94a3b8";

  return (
    <Float speed={1.2} rotationIntensity={0.02} floatIntensity={0.15}>
      <group position={position}>
        {/* Wallet body */}
        <RoundedBox args={[1.0, 0.8, 0.4]} radius={0.12} position={[0, 0, 0]}>
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
        </RoundedBox>
        {/* Wallet flap (more pronounced) */}
        <RoundedBox args={[1.02, 0.4, 0.05]} radius={0.05} position={[0, 0.2, 0.2]} rotation={[0.2, 0, 0]}>
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
        </RoundedBox>
        {/* Inner pocket visible */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.9, 0.6, 0.35]} />
          <meshStandardMaterial color={innerColor} roughness={0.5} transparent opacity={0.4} />
        </mesh>
        {/* Clasp */}
        <mesh position={[0, 0.36, 0.28]}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
          <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Card slots inside */}
        {[-0.15, 0, 0.15].map((zOff, i) => (
          <RoundedBox key={`slot-${i}`} args={[0.7, 0.3, 0.02]} radius={0.01} position={[0, 0.05, zOff * 0.8]}>
            <meshStandardMaterial color={isTarget ? "#059669" : "#475569"} roughness={0.5} transparent opacity={0.3} />
          </RoundedBox>
        ))}
        {/* Label centered on front face of wallet */}
        <Text
          position={[0, -0.05, 0.21]}
          fontSize={0.1}
          color="white"
          anchorX="center"
          anchorY="middle"
          font={undefined}
          maxWidth={0.8}
          textAlign="center"
        >
          {label.toUpperCase()}
        </Text>
      </group>
    </Float>
  );
}

// ─── User Avatar icons ───
function UserAvatar({ index, charPos }: { index: number; charPos: React.MutableRefObject<THREE.Vector3> }) {
  const ref = useRef<THREE.Group>(null!);
  const offset = (index - 1) * 0.25;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const cycle = t % 10;

    let x: number, y: number;
    let scale = 1;

    if (cycle < 2.5) {
      // Sitting in competitor wallet
      x = -2.2 + offset * 0.3;
      y = 0.15;
      scale = 0.8;
    } else if (cycle < 4) {
      // Being picked up
      const p = (cycle - 2.5) / 1.5;
      x = -2.2 + offset * 0.15;
      if (p < 0.5) {
        y = THREE.MathUtils.lerp(0.15, 0.45, easeInOut(p * 2));
      } else {
        y = 0.45 + Math.sin(t * 3 + index) * 0.02;
      }
      scale = 0.7;
    } else if (cycle < 7) {
      // Carried by character - closer to hands
      x = charPos.current.x + offset * 0.12;
      y = 0.45 + Math.sin(t * 3 + index) * 0.02;
      scale = 0.7;
    } else if (cycle < 8.5) {
      // Being dropped
      const p = (cycle - 7) / 1.5;
      x = 2.2 + offset * 0.2;
      if (p < 0.5) {
        y = 0.45 + Math.sin(t * 3 + index) * 0.02;
      } else {
        y = THREE.MathUtils.lerp(0.45, 0.15, easeInOut((p - 0.5) * 2));
      }
      scale = THREE.MathUtils.lerp(0.7, 0.8, p);
    } else {
      // Fade in competitor wallet for reset
      const p = (cycle - 8.5) / 1.5;
      x = 2.2 + offset * 0.2;
      y = 0.15;
      scale = THREE.MathUtils.lerp(0.8, 0, Math.max(0, (p - 0.5) * 2));
    }

    ref.current.position.set(x, y, 0.1);
    ref.current.scale.setScalar(Math.max(0.01, scale));
    ref.current.visible = scale > 0.02;
  });

  const colors = ["#60a5fa", "#f472b6", "#a78bfa"];

  return (
    <group ref={ref}>
      {/* Head */}
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={colors[index % 3]} roughness={0.4} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.045, 0.06, 8, 12]} />
        <meshStandardMaterial color={colors[index % 3]} roughness={0.4} />
      </mesh>
      {/* Glow ring */}
      <mesh position={[0, 0.05, 0]}>
        <ringGeometry args={[0.1, 0.12, 16]} />
        <meshStandardMaterial color={colors[index % 3]} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Particles ───
function Particles() {
  const count = 20;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 7,
    y: Math.random() * 2.5 + 0.5,
    z: (Math.random() - 0.5) * 2,
    speed: 0.2 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
  })), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((s, i) => {
      dummy.position.set(
        s.x + Math.sin(t * s.speed + s.phase) * 0.3,
        s.y + Math.sin(t * s.speed * 0.7 + s.phase) * 0.2,
        s.z
      );
      dummy.scale.setScalar(0.015 + Math.sin(t + s.phase) * 0.008);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#34d399" transparent opacity={0.35} emissive="#34d399" emissiveIntensity={0.2} />
    </instancedMesh>
  );
}

// ─── Scene ───
function Scene() {
  const charPos = useRef(new THREE.Vector3());

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={0.9} />
      <directionalLight position={[-3, 5, -2]} intensity={0.3} color="#a7f3d0" />
      <pointLight position={[0, 3, 2]} intensity={0.4} color="#34d399" />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]} receiveShadow>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.9} transparent opacity={0.15} />
      </mesh>

      {/* Wallets */}
      <Wallet position={[-2.2, -0.2, 0]} label="Competitor Brand" />
      <Wallet position={[2.2, -0.2, 0]} label="Your Brand" isTarget />

      {/* Character */}
      <Character posRef={charPos} />

      {/* User avatars */}
      <UserAvatar index={0} charPos={charPos} />
      <UserAvatar index={1} charPos={charPos} />
      <UserAvatar index={2} charPos={charPos} />

      <Particles />
    </>
  );
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const MigrationAnimation = () => {
  return (
    <div className="relative w-full" style={{ height: "420px" }}>
      <Canvas
        camera={{ position: [0, 2, 6], fov: 35 }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene />
      </Canvas>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="rounded-2xl bg-background/80 backdrop-blur-sm border border-border px-5 py-2.5 shadow-lg">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            Migrating customers in real-time
          </p>
        </div>
      </div>
    </div>
  );
};

export default MigrationAnimation;
