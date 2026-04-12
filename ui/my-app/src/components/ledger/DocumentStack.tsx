import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CARD_WIDTH = 3.2;
const CARD_HEIGHT = 4.4;
const MAX_CARDS = 25;
const STACK_GAP = 0.08;

interface CardData {
  id: number;
  rotation: number;
  offsetX: number;
  offsetZ: number;
}

function DocumentCard({ data, index, total }: { data: CardData; index: number; total: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const targetY = useRef(-index * STACK_GAP);
  const currentY = useRef(-index * STACK_GAP);

  const edgeGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT)), []);

  useEffect(() => {
    targetY.current = -index * STACK_GAP;
  }, [index]);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;
    currentY.current += (targetY.current - currentY.current) * 0.08;
    meshRef.current.position.y = currentY.current;
    const depthFade = Math.max(0, 1 - index / (total * 0.8));
    materialRef.current.opacity = depthFade * 0.85;
  });

  return (
    <mesh
      ref={meshRef}
      position={[data.offsetX, -index * STACK_GAP, data.offsetZ]}
      rotation={[0, 0, data.rotation]}
    >
      <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#F5F3EE"
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
      <lineSegments>
        <primitive object={edgeGeo} attach="geometry" />
        <lineBasicMaterial color="#F5F3EE" transparent opacity={0.12} />
      </lineSegments>
    </mesh>
  );
}

function BlueGlow({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.PointLight>(null);
  const intensity = useRef(3);
  const dead = useRef(false);

  useFrame(() => {
    if (dead.current) return;
    intensity.current *= 0.96;
    if (intensity.current < 0.01) {
      intensity.current = 0;
      dead.current = true;
    }
    if (ref.current) ref.current.intensity = intensity.current;
  });

  if (dead.current) return null;

  return <pointLight ref={ref} position={position} color="#4A7AB5" intensity={3} distance={8} />;
}

function StackScene({ triggerCount }: { triggerCount: number }) {
  const [cards, setCards] = React.useState<CardData[]>(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      rotation: (Math.random() - 0.5) * 0.08,
      offsetX: (Math.random() - 0.5) * 0.15,
      offsetZ: (Math.random() - 0.5) * 0.05,
    }))
  );
  const [glows, setGlows] = React.useState<{ id: number; pos: [number, number, number] }[]>([]);
  const nextId = useRef(15);

  useEffect(() => {
    if (triggerCount === 0) return;
    const cardId = nextId.current++;
    const newCard: CardData = {
      id: cardId,
      rotation: (Math.random() - 0.5) * 0.08,
      offsetX: (Math.random() - 0.5) * 0.15,
      offsetZ: (Math.random() - 0.5) * 0.05,
    };
    const glowId = nextId.current++;
    setCards((prev) => [newCard, ...prev].slice(0, MAX_CARDS));
    setGlows((prev) => [...prev, { id: glowId, pos: [newCard.offsetX, 0.2, 1] }]);
    setTimeout(() => {
      setGlows((prev) => prev.filter((g) => g.id !== glowId));
    }, 1500);
  }, [triggerCount]);

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[2, 4, 3]} intensity={0.3} color="#F5F3EE" />
      <group position={[0, 1.5, 0]} rotation={[0.3, 0.15, 0]}>
        {cards.map((card, i) => (
          <DocumentCard key={card.id} data={card} index={i} total={cards.length} />
        ))}
      </group>
      {glows.map((g) => (
        <BlueGlow key={g.id} position={g.pos} />
      ))}
    </>
  );
}

import React from "react";

const DocumentStack = ({ triggerCount }: { triggerCount: number }) => {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 2, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <StackScene triggerCount={triggerCount} />
      </Canvas>
    </div>
  );
};

export default DocumentStack;
