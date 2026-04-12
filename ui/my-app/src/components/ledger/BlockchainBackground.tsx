import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GRID_SIZE = 40;
const GRID_DIVISIONS = 40;

function InfiniteGrid() {
  const ref = useRef<THREE.GridHelper>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.z = (clock.getElapsedTime() * 0.5) % (GRID_SIZE / GRID_DIVISIONS);
  });

  return (
    <gridHelper
      ref={ref}
      args={[GRID_SIZE, GRID_DIVISIONS, "#1a3a5c", "#0d1f33"]}
      rotation={[0, 0, 0]}
      position={[0, -2, 0]}
    />
  );
}

function FloatingParticles({ count = 120 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const activeIndexRef = useRef(-1);
  const glowRef = useRef(0);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 30,
      y: (Math.random() - 0.5) * 15,
      z: (Math.random() - 0.5) * 20 - 5,
      speed: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      scale: 0.02 + Math.random() * 0.04,
    }));
  }, [count]);

  const colors = useMemo(() => new Float32Array(count * 3), [count]);
  const baseColor = useMemo(() => new THREE.Color("#4A7AB5"), []);
  const glowColor = useMemo(() => new THREE.Color("#7EB8FF"), []);

  useEffect(() => {
    const handler = (e: Event) => {
      const idx = (e as CustomEvent).detail as number;
      activeIndexRef.current = idx % count;
      glowRef.current = 1;
    };
    window.addEventListener("ledger-active", handler);
    return () => window.removeEventListener("ledger-active", handler);
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    glowRef.current = Math.max(0, glowRef.current - 0.008);

    const activeIdx = activeIndexRef.current;
    const glow = glowRef.current;

    particles.forEach((p, i) => {
      const isActive = i === activeIdx;
      const intensity = isActive ? glow : 0;

      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 0.5,
        p.y + Math.cos(t * p.speed * 0.7 + p.phase) * 0.3,
        p.z
      );

      const s = isActive && glow > 0.1
        ? p.scale * (1 + glow * 4)
        : p.scale;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      const c = isActive && intensity > 0.1
        ? glowColor.clone().lerp(baseColor, 1 - intensity)
        : baseColor;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      colors[i * 3] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;
    }
    meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
  }, [count, colors, baseColor]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent opacity={0.07} vertexColors />
    </instancedMesh>
  );
}

function DataStreams() {
  const count = 8;
  const linesRef = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const points = [];
      const x = (i - count / 2) * 3 + (Math.random() - 0.5) * 2;
      for (let j = 0; j < 20; j++) {
        points.push(new THREE.Vector3(x, -3 + j * 0.8, -8 + Math.sin(j * 0.5) * 2));
      }
      return { points, phase: Math.random() * Math.PI * 2 };
    });
  }, []);

  useFrame(({ clock }) => {
    if (!linesRef.current) return;
    const t = clock.getElapsedTime();
    linesRef.current.children.forEach((child, i) => {
      const mat = (child as THREE.Line).material as THREE.LineBasicMaterial;
      mat.opacity = 0.08 + Math.sin(t * 0.5 + lines[i].phase) * 0.05;
    });
  });

  return (
    <group ref={linesRef}>
      {lines.map((line, i) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(line.points);
        return (
          <line key={i}>
            <primitive object={geometry} attach="geometry" />
            <lineBasicMaterial color="#4A7AB5" transparent opacity={0.1} />
          </line>
        );
      })}
    </group>
  );
}

function Scene() {
  return (
    <>
      <fog attach="fog" args={["#0F0E0C", 5, 30]} />
      <ambientLight intensity={0.05} />
      <InfiniteGrid />
      <FloatingParticles />
      <DataStreams />
    </>
  );
}

const BlockchainBackground = () => {
  return (
    <div className="fixed inset-0 z-0" style={{ pointerEvents: "none" }}>
      <Canvas
        camera={{ position: [0, 3, 10], fov: 60, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default BlockchainBackground;
