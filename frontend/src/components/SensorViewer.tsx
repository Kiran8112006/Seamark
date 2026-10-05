'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

type ViewMode = 'ASSEMBLY' | 'EXPLODED' | 'CUTAWAY';

interface SensorViewerProps {
  viewMode: ViewMode;
  selectedComponent: string | null;
}

// Component colors — muted engineering palette
const COLORS = {
  housing: '#707880',
  electronics: '#4a6741',
  boom: '#b8a060',
  txCoil: '#8b5a2b',
  rxCoil: '#6b4226',
  magnetometer: '#5a6e80',
  frame: '#606868',
  feet: '#888888',
  deployment: '#a04040',
  highlight: '#1c3568',
};

export default function SensorViewer({ viewMode, selectedComponent }: SensorViewerProps) {
  const explodeOffset = viewMode === 'EXPLODED' ? 1.8 : 0;
  const isCutaway = viewMode === 'CUTAWAY';

  return (
    <Canvas
      camera={{ position: [6, 4, 6], fov: 40 }}
      style={{ width: '100%', height: '100%', background: '#f4f5f7' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />
      <directionalLight position={[-3, 2, -3]} intensity={0.3} />

      {/* Grid */}
      <gridHelper args={[10, 20, '#d1d5db', '#e5e7eb']} position={[0, -2.5, 0]} />

      {/* Axis indicators */}
      <Line points={[[0, -2.5, 0], [3, -2.5, 0]]} color="#b53a2a" lineWidth={1.5} />
      <Line points={[[0, -2.5, 0], [0, 0.5, 0]]} color="#2d7a3a" lineWidth={1.5} />
      <Line points={[[0, -2.5, 0], [0, -2.5, 3]]} color="#2a6fb5" lineWidth={1.5} />

      {/* Sensor Assembly */}
      <group>
        {/* Pressure Housing — main cylinder */}
        <SensorPart
          name="Pressure Housing"
          selected={selectedComponent}
          position={[0, explodeOffset * 2, 0]}
        >
          <CylinderMesh
            radius={0.45}
            height={1.8}
            color={selectedComponent === 'Pressure Housing' ? COLORS.highlight : COLORS.housing}
            cutaway={isCutaway}
          />
          {/* End caps */}
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.48, 0.48, 0.08, 24]} />
            <meshStandardMaterial color={COLORS.housing} metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.9, 0]}>
            <cylinderGeometry args={[0.48, 0.48, 0.08, 24]} />
            <meshStandardMaterial color={COLORS.housing} metalness={0.6} roughness={0.4} />
          </mesh>
        </SensorPart>

        {/* Electronics Module — inside housing */}
        <SensorPart
          name="Electronics Module"
          selected={selectedComponent}
          position={[0, explodeOffset * 3.2, 0]}
        >
          <mesh>
            <boxGeometry args={[0.3, 0.6, 0.3]} />
            <meshStandardMaterial
              color={selectedComponent === 'Electronics Module' ? COLORS.highlight : COLORS.electronics}
              metalness={0.3}
              roughness={0.7}
            />
          </mesh>
          {/* Small connectors */}
          {[0.12, -0.12].map((x) => (
            <mesh key={x} position={[x, 0.35, 0]}>
              <boxGeometry args={[0.04, 0.08, 0.04]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          ))}
        </SensorPart>

        {/* Non-Magnetic Boom — extending forward */}
        <SensorPart
          name="Non-Magnetic Boom"
          selected={selectedComponent}
          position={[0, 0, explodeOffset * 1.5]}
        >
          <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 2.0, 12]} />
            <meshStandardMaterial
              color={selectedComponent === 'Non-Magnetic Boom' ? COLORS.highlight : COLORS.boom}
              metalness={0.1}
              roughness={0.8}
            />
          </mesh>
        </SensorPart>

        {/* EM TX Coil */}
        <SensorPart
          name="EM TX Coil"
          selected={selectedComponent}
          position={[0, 0, explodeOffset * 2.5]}
        >
          <mesh position={[0, 0, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.35, 0.03, 12, 32]} />
            <meshStandardMaterial
              color={selectedComponent === 'EM TX Coil' ? COLORS.highlight : COLORS.txCoil}
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
          <ComponentLabel text="TX" position={[0.5, 0.15, 1.8]} />
        </SensorPart>

        {/* EM RX Coil */}
        <SensorPart
          name="EM RX Coil"
          selected={selectedComponent}
          position={[0, 0, explodeOffset * 3]}
        >
          <mesh position={[0, 0, 2.2]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.25, 0.025, 12, 32]} />
            <meshStandardMaterial
              color={selectedComponent === 'EM RX Coil' ? COLORS.highlight : COLORS.rxCoil}
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
          <ComponentLabel text="RX" position={[0.4, 0.15, 2.2]} />
        </SensorPart>

        {/* Magnetometer */}
        <SensorPart
          name="Magnetometer"
          selected={selectedComponent}
          position={[explodeOffset * 1.5, 0, 0]}
        >
          <mesh position={[0.6, 0, 0.5]}>
            <boxGeometry args={[0.15, 0.15, 0.25]} />
            <meshStandardMaterial
              color={selectedComponent === 'Magnetometer' ? COLORS.highlight : COLORS.magnetometer}
              metalness={0.4}
              roughness={0.5}
            />
          </mesh>
          <ComponentLabel text="MAG" position={[0.6, 0.2, 0.5]} />
        </SensorPart>

        {/* Protective Frame */}
        <SensorPart
          name="Protective Frame"
          selected={selectedComponent}
          position={[0, -explodeOffset * 0.5, 0]}
        >
          <FrameGeometry
            color={selectedComponent === 'Protective Frame' ? COLORS.highlight : COLORS.frame}
          />
        </SensorPart>

        {/* Stand-Off Feet */}
        <SensorPart
          name="Stand-Off Feet"
          selected={selectedComponent}
          position={[0, -explodeOffset * 1.5, 0]}
        >
          {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z], i) => (
            <mesh key={i} position={[x, -1.6, z]}>
              <cylinderGeometry args={[0.12, 0.15, 0.3, 8]} />
              <meshStandardMaterial
                color={selectedComponent === 'Stand-Off Feet' ? COLORS.highlight : COLORS.feet}
                metalness={0.3}
                roughness={0.6}
              />
            </mesh>
          ))}
        </SensorPart>

        {/* Deployment Point */}
        <SensorPart
          name="Deployment Point"
          selected={selectedComponent}
          position={[0, explodeOffset * 4, 0]}
        >
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 0.25, 8]} />
            <meshStandardMaterial
              color={selectedComponent === 'Deployment Point' ? COLORS.highlight : COLORS.deployment}
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
          {/* Ring */}
          <mesh position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.02, 8, 16]} />
            <meshStandardMaterial color={COLORS.deployment} metalness={0.6} roughness={0.3} />
          </mesh>
        </SensorPart>
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={3}
        maxDistance={15}
        target={[0, 0, 0.5]}
      />
    </Canvas>
  );
}

function SensorPart({
  name,
  selected,
  position,
  children,
}: {
  name: string;
  selected: string | null;
  position: [number, number, number];
  children: React.ReactNode;
}) {
  const isSelected = selected === name;
  return (
    <group position={position}>
      {children}
    </group>
  );
}

function CylinderMesh({
  radius,
  height,
  color,
  cutaway,
}: {
  radius: number;
  height: number;
  color: string;
  cutaway: boolean;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 24, 1, false, 0, cutaway ? Math.PI * 1.5 : Math.PI * 2);
    return geo;
  }, [radius, height, cutaway]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        metalness={0.5}
        roughness={0.4}
        side={cutaway ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}

function FrameGeometry({ color }: { color: string }) {
  const bars: [number, number, number, number, number, number][] = [
    // Vertical bars
    [-0.55, -0.5, -0.55, 0.06, 2.2, 0.06],
    [0.55, -0.5, -0.55, 0.06, 2.2, 0.06],
    [-0.55, -0.5, 0.55, 0.06, 2.2, 0.06],
    [0.55, -0.5, 0.55, 0.06, 2.2, 0.06],
    // Top horizontal
    [0, 0.6, -0.55, 1.16, 0.06, 0.06],
    [0, 0.6, 0.55, 1.16, 0.06, 0.06],
    [-0.55, 0.6, 0, 0.06, 0.06, 1.16],
    [0.55, 0.6, 0, 0.06, 0.06, 1.16],
    // Bottom horizontal
    [0, -1.5, -0.55, 1.16, 0.06, 0.06],
    [0, -1.5, 0.55, 1.16, 0.06, 0.06],
    [-0.55, -1.5, 0, 0.06, 0.06, 1.16],
    [0.55, -1.5, 0, 0.06, 0.06, 1.16],
  ];

  return (
    <group>
      {bars.map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function ComponentLabel({ text, position }: { text: string; position: [number, number, number] }) {
  return (
    <Text
      position={position}
      fontSize={0.12}
      color="#4b5563"
      anchorX="left"
      anchorY="middle"
      font={undefined}
    >
      {text}
    </Text>
  );
}
