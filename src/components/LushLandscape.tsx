import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Text, PerspectiveCamera, Sky, ContactShadows, Environment, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

// ─── Stylized 3D Character (Adapted from MigrationAnimation) ───
function Character({ posRef }: { posRef: React.MutableRefObject<THREE.Vector3> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const leftLegRef = useRef<THREE.Group>(null!);
  const rightLegRef = useRef<THREE.Group>(null!);
  const leftArmRef = useRef<THREE.Group>(null!);
  const rightArmRef = useRef<THREE.Group>(null!);
  const bodyBobRef = useRef<THREE.Group>(null!);

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
    const cycle = t % 12; // Slightly longer cycle for larger scene
    let x: number;
    let z: number = 0;
    let facingRight = true;
    let isWalking = true;
    let bendDown = 0;

    // Path: [-8.5, 0, 0] (Competitor) to [8.5, 0, 0] (Karbali)
    if (cycle < 4) {
      // Walk to Competitor
      const p = cycle / 4;
      x = THREE.MathUtils.lerp(0, -8.5, easeInOut(p));
      facingRight = false;
    } else if (cycle < 5.5) {
      // At Competitor
      x = -8.5;
      isWalking = false;
      facingRight = false;
      bendDown = Math.sin(((cycle - 4) / 1.5) * Math.PI) * 0.4;
    } else if (cycle < 9.5) {
      // Walk to Karbali
      const p = (cycle - 5.5) / 4;
      x = THREE.MathUtils.lerp(-8.5, 8.5, easeInOut(p));
      facingRight = true;
    } else if (cycle < 11) {
      // At Karbali
      x = 8.5;
      isWalking = false;
      bendDown = Math.sin(((cycle - 9.5) / 1.5) * Math.PI) * 0.4;
    } else {
      // Walk back to center
      const p = (cycle - 11) / 1;
      x = THREE.MathUtils.lerp(8.5, 0, easeInOut(p));
      facingRight = false;
    }

    groupRef.current.position.set(x, 0.1, z);
    posRef.current.set(x, 0.1, z);
    groupRef.current.rotation.y = facingRight ? Math.PI / 2 : -Math.PI / 2;

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
      bodyBobRef.current.position.y = isWalking ? Math.abs(Math.sin(t * walkSpeed)) * 0.06 : 0;
      bodyBobRef.current.rotation.x = bendDown;
    }
  });

  const skinColor = "#6B4226";
  const noseColor = "#FF8A8A";
  const hairColor = "#9BD8F2";
  const sweaterColor = "#E85D3A";

  return (
    <group ref={groupRef} scale={0.8}>
      <group ref={bodyBobRef}>
        <group ref={leftLegRef} position={[-0.1, -0.05, 0]}>
          <mesh position={[0, -0.4, 0]}>
            <capsuleGeometry args={[0.055, 0.3, 8, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.1, -0.05, 0]}>
          <mesh position={[0, -0.4, 0]}>
            <capsuleGeometry args={[0.055, 0.3, 8, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
        </group>
        <mesh position={[0, 0.22, 0]}>
          <capsuleGeometry args={[0.17, 0.28, 8, 16]} />
          <meshStandardMaterial color={sweaterColor} roughness={0.8} />
        </mesh>
        <group ref={leftArmRef} position={[-0.22, 0.32, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.04, 0.22, 8, 16]} />
            <meshStandardMaterial color={sweaterColor} roughness={0.8} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.22, 0.32, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.04, 0.22, 8, 16]} />
            <meshStandardMaterial color={sweaterColor} roughness={0.8} />
          </mesh>
        </group>
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.5, 0.16]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={noseColor} roughness={0.6} />
        </mesh>
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
      </group>
    </group>
  );
}

// ─── Stylized Tree ───
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Group>(null!);
  const randomOffset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.z = Math.sin(t * 0.5 + randomOffset) * 0.05;
    ref.current.rotation.x = Math.cos(t * 0.3 + randomOffset) * 0.03;
  });

  return (
    <group position={position} scale={scale} ref={ref}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
        <meshStandardMaterial color="#4A2F1B" />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[0.8, 1.5, 8]} />
        <meshStandardMaterial color="#2D5A27" />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <coneGeometry args={[0.6, 1.2, 8]} />
        <meshStandardMaterial color="#3A7532" />
      </mesh>
    </group>
  );
}

// ─── Flowing River ───
function River() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]} receiveShadow>
      <planeGeometry args={[30, 6, 64, 64]} />
      <MeshDistortMaterial
        color="#3B82F6"
        transparent
        opacity={0.6}
        roughness={0}
        metalness={0.5}
        distort={0.4}
        speed={4}
      />
    </mesh>
  );
}

// ─── Structures ───
function Structure({ position, color, label, isKarbali }: { position: [number, number, number]; color: string; label: string; isKarbali?: boolean }) {
  return (
    <group position={position}>
      <RoundedBox args={[2, 2.5, 2]} radius={0.1} position={[0, 1.25, 0]}>
        <meshStandardMaterial color={color} roughness={0.5} metalness={isKarbali ? 0.3 : 0} />
      </RoundedBox>
      {isKarbali && (
        <mesh position={[0, 1.25, 1.05]}>
          <planeGeometry args={[1.5, 1.8]} />
          <meshStandardMaterial color="#10b981" transparent opacity={0.4} />
        </mesh>
      )}
      <Text
        position={[0, 2.8, 0]}
        fontSize={0.4}
        color={isKarbali ? "#10b981" : "#64748b"}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

// ─── Main Scene ───
function Scene() {
  const charPos = useRef(new THREE.Vector3());

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 6, 16]} fov={35} />
      <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} />
      <Environment preset="forest" />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#2d4529" roughness={0.9} />
      </mesh>

      {/* River */}
      <group position={[0, 0, -2]}>
        <River />
      </group>

      <Sparkles count={50} scale={[20, 10, 20]} size={2} speed={0.5} opacity={0.5} color="#fff" />
      <Sparkles count={30} scale={[25, 5, 25]} size={4} speed={0.8} opacity={0.3} color="#10b981" />

      {/* Trees - Pushed further back and to the sides to clear center */}
      <Tree position={[-14, -0.7, -10]} scale={2} />
      <Tree position={[-10, -0.7, -15]} scale={1.5} />
      <Tree position={[14, -0.7, -10]} scale={2.5} />
      <Tree position={[10, -0.7, -15]} scale={1.8} />
      <Tree position={[0, -0.7, -30]} scale={5} />

      <Tree position={[-18, -0.7, 5]} scale={1.8} />
      <Tree position={[18, -0.7, 5]} scale={2} />

      <Tree position={[-22, -0.7, 12]} scale={2.5} />
      <Tree position={[22, -0.7, 12]} scale={3} />

      {/* Structures - Pushed back to Z=-6 and wider to clear Hero text */}
      <Structure position={[-10, -0.7, -6]} color="#4B5563" label="Competitor" />
      <Structure position={[10, -0.7, -6]} color="#065F46" label="Karbali" isKarbali />

      {/* Character - Walking on Z=-6 line */}
      <group position={[0, 0, -6]}>
        <Character posRef={charPos} />
      </group>

      <ContactShadows
        position={[0, -0.69, 0]}
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
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
      {/* Visual Overlays for "Real Life Animated Video" feel */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/40" />
      <div className="absolute inset-0 pointer-events-none backdrop-blur-[0.5px]" />
    </div>
  );
};

export default LushLandscape;
