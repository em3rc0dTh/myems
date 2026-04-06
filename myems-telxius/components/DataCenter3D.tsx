"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

interface Position {
  id: string;
  row: string;
  col: number;
  status: "EMPTY" | "OCCUPIED" | "RESERVED";
  label: string | null;
  widthUnits: number;
  depthUnits: number;
  physWidthCm: number;
  physDepthCm: number;
}

interface Substructure {
  id: string; name: string;
  gridRows: string[]; gridCols: number[];
}

interface Props {
  room: Substructure;
  positions: Position[];
  onRackClick?: (pos: Position | null) => void;
}

const TILE_SIZE = 1.0; 
const RACK_H    = 3.6;
const GAP       = 0.15;

function makeCellTexture(row: string, col: number, status: string): THREE.CanvasTexture {
  const SIZE = 256;
  const canvas = document.createElement("canvas");
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const isOcc = status === "OCCUPIED";
  const isRes = status === "RESERVED";

  ctx.fillStyle = isOcc ? "#25225c" : isRes ? "#422e10" : "#12121f";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = isOcc ? "#818cf8" : isRes ? "#f59e0b" : "#2e2b5e";
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, SIZE - 12, SIZE - 12);

  ctx.font = "bold 100px 'Inter', sans-serif";
  ctx.fillStyle = "#a78bfa"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText(row, 20, 15);
  ctx.fillStyle = "#34d399"; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillText(String(col), SIZE - 20, SIZE - 15);

  return new THREE.CanvasTexture(canvas);
}

export default function DataCenter3D({ room, positions, onRackClick }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);
  const hovered  = useRef<THREE.Mesh | null>(null);
  const posMap   = useRef<Map<THREE.Mesh, Position>>(new Map());

  const rowIndex = useCallback((row: string) => room.gridRows.indexOf(row), [room.gridRows]);
  const colIndex = useCallback((col: number) => room.gridCols.indexOf(col), [room.gridCols]);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.FogExp2(0x0a0a14, 0.012);

    const cols = room.gridCols.length;
    const rows = room.gridRows.length;
    const cx = (cols - 1) * (TILE_SIZE + GAP) / 2;
    const cz = (rows - 1) * (TILE_SIZE + GAP) / 2;

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 500);
    camera.position.set(cx + cols * 2, 10, cz + rows * 2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(cx, 0, cz);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(20, 40, 20);
    key.castShadow = true;
    scene.add(key);

    posMap.current.clear();
    const occupiedMap = new Map(positions.map(p => [`${p.row}-${p.col}`, p]));

    // Dibujar Grid de Baldosas
    room.gridRows.forEach(row => {
      room.gridCols.forEach(col => {
        const ri = rowIndex(row), ci = colIndex(col);
        const x = ci * (TILE_SIZE + GAP), z = ri * (TILE_SIZE + GAP);
        const posData = occupiedMap.get(`${row}-${col}`);
        const status = posData?.status || "EMPTY";

        const tex = makeCellTexture(row, col, status);
        const pad = new THREE.Mesh(
          new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE),
          new THREE.MeshStandardMaterial({ map: tex, emissive: status === "EMPTY" ? 0x000000 : status === "OCCUPIED" ? 0x4338ca : 0xf59e0b, emissiveIntensity: 0.3 })
        );
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(x, 0, z);
        pad.receiveShadow = true;
        scene.add(pad);

        // Si es el ORIGEN de un Device ocupado
        if (status === "OCCUPIED" && posData) {
          // Lógica de centrado: si ocupa 4 baldosas, el centro está en (ci + 1.5)
          const midX = (ci + (posData.widthUnits - 1) / 2) * (TILE_SIZE + GAP);
          const midZ = (ri + (posData.depthUnits - 1) / 2) * (TILE_SIZE + GAP);
          
          // Escala física real (cm / 60)
          const scaleW = posData.physWidthCm / 60;
          const scaleD = posData.physDepthCm / 60;

          const rack = new THREE.Mesh(
            new THREE.BoxGeometry(scaleW, RACK_H, scaleD),
            new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.1, metalness: 0.9, emissive: 0x6366f1, emissiveIntensity:0.15 })
          );
          rack.position.set(midX, RACK_H / 2 + 0.05, midZ);
          rack.castShadow = true;
          scene.add(rack);
          posMap.current.set(rack, posData);

          const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(scaleW, RACK_H, scaleD));
          const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x818cf8, transparent:true, opacity:0.6 }));
          line.position.copy(rack.position);
          scene.add(line);
        }
      });
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const rackMeshes = Array.from(posMap.current.keys());

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(rackMeshes);
      if (hits.length > 0) {
        const m = hits[0].object as THREE.Mesh;
        if (hovered.current !== m) {
          if (hovered.current) (hovered.current.material as any).emissiveIntensity = 0.15;
          hovered.current = m; (m.material as any).emissiveIntensity = 1.2;
          el.style.cursor = "pointer";
        }
      } else {
        if (hovered.current) (hovered.current.material as any).emissiveIntensity = 0.15;
        hovered.current = null; el.style.cursor = "default";
      }
    };

    const onClick = () => { if (hovered.current && onRackClick) onRackClick(posMap.current.get(hovered.current) || null); };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("click", onClick);

    const animate = () => { rafRef.current = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [room.id, positions, rowIndex, colIndex, onRackClick]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
