import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

type State = 'IDLE' | 'WALKING_TO_OLD' | 'PICKING_UP' | 'WALKING_TO_NEW' | 'DEPOSITING';

const Migration3D = () => {
  const [uiState, setUiState] = useState<State>('IDLE');
  const stateRef = useRef<State>('IDLE');
  const containerRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<THREE.Group | null>(null);
  const avatarRef = useRef<THREE.Group | null>(null);

  const rightArmRef = useRef<THREE.Group | null>(null);
  const leftLegRef = useRef<THREE.Group | null>(null);
  const rightLegRef = useRef<THREE.Group | null>(null);

  // Sync stateRef with uiState for the animation loop
  useEffect(() => {
    stateRef.current = uiState;
  }, [uiState]);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Constants ---
    const OLD_X = -2.2;
    const NEW_X = 2.2;
    const WALK_SPEED = 0.03;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 1.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(10, 10, 10);
    pointLight.castShadow = true;
    scene.add(pointLight);

    // --- Character Creation ---
    const character = new THREE.Group();
    characterRef.current = character;
    scene.add(character);

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.8, 4, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    body.castShadow = true;
    character.add(body);

    // Flowers (Pattern on sweater)
    const flowerGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const flowerPositions = [[0.2, 0.3, 0.35], [-0.2, 0.1, 0.35], [0, -0.2, 0.45], [0.2, -0.1, -0.35], [-0.1, 0.4, -0.35]];
    flowerPositions.forEach(pos => {
      const f = new THREE.Mesh(flowerGeo, flowerMat);
      f.position.set(pos[0], pos[1], pos[2]);
      body.add(f);
    });

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.4;
    character.add(headGroup);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
    const faceGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.castShadow = true;
    headGroup.add(face);

    // Enhanced Fuzzy Hair
    const hairGroup = new THREE.Group();
    headGroup.add(hairGroup);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.9 });

    // Main hair mass
    const mainHair = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), hairMat);
    mainHair.position.y = 0.1;
    hairGroup.add(mainHair);

    // Add fuzzy clusters
    for (let i = 0; i < 12; i++) {
      const fuzz = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), hairMat);
      const angle = (i / 12) * Math.PI * 2;
      fuzz.position.set(Math.cos(angle) * 0.35, Math.sin(angle) * 0.35 + 0.1, Math.random() * 0.2);
      hairGroup.add(fuzz);
    }

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

    [0.12, -0.12].forEach(x => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, 0.05, 0.25);
      headGroup.add(eye);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.03;
      eye.add(pupil);
    });

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.08, 0.5, 4, 8);
    const rightArm = new THREE.Group();
    rightArm.position.set(0.45, 1.7, 0);
    character.add(rightArm);
    rightArmRef.current = rightArm;
    const rArmMesh = new THREE.Mesh(armGeo, bodyMat);
    rArmMesh.position.y = -0.25;
    rightArm.add(rArmMesh);

    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.1, 0.6, 4, 8);
    const leftLeg = new THREE.Mesh(legGeo, skinMat);
    leftLeg.position.set(-0.2, 0.5, 0);
    character.add(leftLeg);
    leftLegRef.current = leftLeg;

    const rightLeg = new THREE.Mesh(legGeo, skinMat);
    rightLeg.position.set(0.2, 0.5, 0);
    character.add(rightLeg);
    rightLegRef.current = rightLeg;

    // --- Wallets ---
    const createWallet = (x: number, color: number, isTarget: boolean) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(x, 0.5, 0);
      scene.add(wGroup);

      const cylGeo = new THREE.CylinderGeometry(1, 0.8, 0.6, 32, 1, true);
      const cylMat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const cyl = new THREE.Mesh(cylGeo, cylMat);
      wGroup.add(cyl);

      const baseGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.05, 32);
      const baseMat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = -0.28;
      wGroup.add(base);

      if (isTarget) {
        const glowGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.5, 32, 1, true);
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.2, emissive: 0x10b981, emissiveIntensity: 0.5 });
        wGroup.add(new THREE.Mesh(glowGeo, glowMat));
      }
      return wGroup;
    };
    createWallet(-3, 0xffffff, false);
    createWallet(3, 0x10b981, true);

    // --- Avatars ---
    const avatar = new THREE.Group();
    avatar.position.set(-3, 0.8, 0);
    scene.add(avatar);
    avatarRef.current = avatar;

    const coinGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.8 });
    const coin = new THREE.Mesh(coinGeo, coinMat);
    avatar.add(coin);

    const detailGeo = new THREE.BoxGeometry(0.1, 0.1, 0.05);
    const detailMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
    const detail = new THREE.Mesh(detailGeo, detailMat);
    detail.position.z = 0.12;
    coin.add(detail);

    // --- Animation Loop ---
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const state = stateRef.current;

      const char = characterRef.current;
      const av = avatarRef.current;
      if (!char) return;

      let isWalking = false;

      // Movement Logic
      if (state === 'WALKING_TO_OLD') {
        if (char.position.x > OLD_X) {
          char.position.x -= WALK_SPEED;
          char.rotation.y = -Math.PI / 2;
          isWalking = true;
        }
      } else if (state === 'WALKING_TO_NEW') {
        if (char.position.x < NEW_X) {
          char.position.x += WALK_SPEED;
          char.rotation.y = Math.PI / 2;
          isWalking = true;
        }
      } else {
        char.rotation.y = THREE.MathUtils.lerp(char.rotation.y, 0, 0.1);
      }

      // Procedural Walk Animation
      if (isWalking) {
        const cycle = t * 10;
        if (leftLegRef.current) {
          leftLegRef.current.position.y = 0.5 + Math.max(0, Math.sin(cycle) * 0.2);
          leftLegRef.current.position.z = Math.cos(cycle) * 0.3;
        }
        if (rightLegRef.current) {
          rightLegRef.current.position.y = 0.5 + Math.max(0, Math.sin(cycle + Math.PI) * 0.2);
          rightLegRef.current.position.z = Math.cos(cycle + Math.PI) * 0.3;
        }
        char.position.y = Math.sin(cycle * 2) * 0.05;
      } else {
        char.position.y = THREE.MathUtils.lerp(char.position.y, 0, 0.1);
        if (leftLegRef.current) {
          leftLegRef.current.position.y = THREE.MathUtils.lerp(leftLegRef.current.position.y, 0.5, 0.1);
          leftLegRef.current.position.z = THREE.MathUtils.lerp(leftLegRef.current.position.z, 0, 0.1);
        }
        if (rightLegRef.current) {
          rightLegRef.current.position.y = THREE.MathUtils.lerp(rightLegRef.current.position.y, 0.5, 0.1);
          rightLegRef.current.position.z = THREE.MathUtils.lerp(rightLegRef.current.position.z, 0, 0.1);
        }
      }

      // Avatar attachment logic
      if (av && rightArmRef.current) {
        if (state === 'WALKING_TO_NEW' || state === 'PICKING_UP' || state === 'DEPOSITING') {
          const handPos = new THREE.Vector3();
          rightArmRef.current.getWorldPosition(handPos);
          const offset = new THREE.Vector3(0, -0.5, 0).applyQuaternion(rightArmRef.current.quaternion);
          handPos.add(offset);

          if (state === 'PICKING_UP') av.position.lerp(handPos, 0.1);
          else if (state === 'DEPOSITING') av.position.lerp(new THREE.Vector3(3, 0.8, 0), 0.1);
          else av.position.copy(handPos);
        } else if (state === 'IDLE' || state === 'WALKING_TO_OLD') {
          av.position.lerp(new THREE.Vector3(-3, 0.8, 0), 0.1);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  // Sequence Timer
  useEffect(() => {
    let mounted = true;
    const sequence = async () => {
      while (mounted) {
        setUiState('WALKING_TO_OLD');
        await new Promise(r => setTimeout(r, 3000));
        if (!mounted) break;
        setUiState('PICKING_UP');
        await new Promise(r => setTimeout(r, 1000));
        if (!mounted) break;
        setUiState('WALKING_TO_NEW');
        await new Promise(r => setTimeout(r, 4000));
        if (!mounted) break;
        setUiState('DEPOSITING');
        await new Promise(r => setTimeout(r, 1000));
        if (!mounted) break;
        setUiState('IDLE');
        await new Promise(r => setTimeout(r, 1000));
      }
    };
    sequence();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="h-[450px] md:h-[550px] w-full relative group">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-10 left-0 w-full flex justify-between px-10 md:px-20 pointer-events-none">
        <span className="text-[10px] font-black tracking-[0.2em] text-foreground/50 uppercase">Competitor Brand</span>
        <span className="text-[10px] font-black tracking-[0.2em] text-emerald-500 uppercase">Your Brand</span>
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
         <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
            <p className="text-[10px] font-bold text-foreground/70 uppercase tracking-widest flex items-center gap-2">
               <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               {uiState.replace(/_/g, ' ')}
            </p>
         </div>
      </div>
    </div>
  );
};

export default Migration3D;
