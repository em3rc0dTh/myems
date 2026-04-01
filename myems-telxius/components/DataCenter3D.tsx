"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

interface Container { id: string; name: string; row: string; position: number; }
interface Substructure {
  id: string; name: string;
  gridRows: string[]; gridCols: number[];
}

interface Props {
  room: Substructure;
  containers: Container[];
  onRackClick?: (rack: Container | null) => void;
}

const RACK_W = 1.2;
const RACK_D = 1.0;
const RACK_H = 3.4;
const GAP   = 0.65;

export default function DataCenter3D({ room, containers, onRackClick }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);
  const hovered  = useRef<THREE.Mesh | null>(null);
  const rackMap  = useRef<Map<THREE.Mesh, Container>>(new Map());

  const rowIndex = useCallback((row: string) => room.gridRows.indexOf(row), [room.gridRows]);
  const colIndex = useCallback((col: number) => room.gridCols.indexOf(col), [room.gridCols]);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W  = el.clientWidth  || 800;
    const H  = el.clientHeight || 600;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    el.appendChild(renderer.domElement);

    // ── Scene & background gradient ───────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1021);  // deep navy — not pitch black
    scene.fog        = new THREE.FogExp2(0x0f1021, 0.022);

    // ── Grid dimensions center ─────────────────────────────────────────────────
    const cols = room.gridCols.length;
    const rows = room.gridRows.length;
    const cx   = (cols - 1) * (RACK_W + GAP) / 2;
    const cz   = (rows - 1) * (RACK_D + GAP) / 2;

    // ── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 300);
    camera.position.set(cx + cols * 2.8, cols * 1.6 + 6, cz + rows * 3.0);
    camera.lookAt(cx, RACK_H * 0.4, cz);

    // ── Controls ──────────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(cx, RACK_H * 0.3, cz);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance   = 3;
    controls.maxDistance   = 60;
    controls.maxPolarAngle = Math.PI / 2.05;

    // ── Lights ────────────────────────────────────────────────────────────────
    // Strong ambient so nothing is pitch-black
    scene.add(new THREE.AmbientLight(0x8899cc, 2.5));

    // Cold-white key light from top-left
    const key = new THREE.DirectionalLight(0xddeeff, 4.0);
    key.position.set(-8, 18, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.far = 100;
    key.shadow.camera.left = -20;
    key.shadow.camera.right = 20;
    key.shadow.camera.top = 20;
    key.shadow.camera.bottom = -20;
    key.shadow.bias = -0.001;
    scene.add(key);

    // Warm fill from opposite side
    const fill = new THREE.DirectionalLight(0xffd4a8, 1.5);
    fill.position.set(12, 8, -6);
    scene.add(fill);

    // Purple overhead accent (animated)
    const accent = new THREE.PointLight(0x7c3aed, 12, 40);
    accent.position.set(cx, 12, cz);
    scene.add(accent);

    // Cyan rim light from behind
    const rim = new THREE.PointLight(0x06b6d4, 6, 35);
    rim.position.set(cx - cols * 2, 6, cz - rows * 2);
    scene.add(rim);

    // ── Floor ─────────────────────────────────────────────────────────────────
    const floorW = cols * (RACK_W + GAP) + GAP * 3;
    const floorD = rows * (RACK_D + GAP) + GAP * 3;

    // Reflective floor tile
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD, cols * 2, rows * 2),
      new THREE.MeshStandardMaterial({
        color: 0x141428,
        roughness: 0.3,
        metalness: 0.6,
        envMapIntensity: 1,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, -0.01, cz);
    floor.receiveShadow = true;
    scene.add(floor);

    // Bright grid lines
    const grid = new THREE.GridHelper(
      Math.max(floorW, floorD) + 3,
      Math.max(cols, rows) * 2 + 4,
      0x4338ca,   // indigo main lines
      0x1e1b4b    // indigo minor lines
    );
    grid.position.set(cx, 0.001, cz);
    scene.add(grid);

    // ── Row / Col labels as floating planes ────────────────────────────────────
    // (Simple colored markers at row/col edges)
    room.gridRows.forEach((row, ri) => {
      const z = ri * (RACK_D + GAP);
      const marker = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.35),
        new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(-0.9, 0.01, z);
      scene.add(marker);
    });

    room.gridCols.forEach((col, ci) => {
      const x = ci * (RACK_W + GAP);
      const marker = new THREE.Mesh(
        new THREE.PlaneGeometry(RACK_W, 0.35),
        new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(x, 0.01, -0.8);
      scene.add(marker);
    });

    // ── Empty slot pads (glowing floor tiles) ────────────────────────────────
    const occupiedSet = new Set(containers.map(c => `${c.row}-${c.position}`));

    room.gridRows.forEach((row) => {
      room.gridCols.forEach((col) => {
        const ri = rowIndex(row);
        const ci = colIndex(col);
        const x  = ci * (RACK_W + GAP);
        const z  = ri * (RACK_D + GAP);

        // Floor pad for every cell
        const pad = new THREE.Mesh(
          new THREE.PlaneGeometry(RACK_W - 0.1, RACK_D - 0.1),
          new THREE.MeshStandardMaterial({
            color: occupiedSet.has(`${row}-${col}`) ? 0x312e81 : 0x1e1b4b,
            emissive: occupiedSet.has(`${row}-${col}`) ? 0x4338ca : 0x1e1b4b,
            emissiveIntensity: 0.4,
            roughness: 0.5,
          })
        );
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(x, 0.005, z);
        scene.add(pad);

        if (!occupiedSet.has(`${row}-${col}`)) {
          // Thin wireframe ghost box for empty slots
          const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(RACK_W - 0.05, 0.08, RACK_D - 0.05));
          const ghost = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x312e81 }));
          ghost.position.set(x, 0.04, z);
          scene.add(ghost);
        }
      });
    });

    // ── Racks ────────────────────────────────────────────────────────────────
    rackMap.current.clear();
    const rackLights: THREE.PointLight[] = [];

    containers.forEach((rack) => {
      const ri = rowIndex(rack.row);
      const ci = colIndex(rack.position);
      if (ri === -1 || ci === -1) return;

      const x = ci * (RACK_W + GAP);
      const z = ri * (RACK_D + GAP);

      // Main rack body — steel dark blue with metallic sheen
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(RACK_W, RACK_H, RACK_D),
        new THREE.MeshStandardMaterial({
          color: 0x1e1b4b,
          roughness: 0.25,
          metalness: 0.75,
          emissive: 0x4338ca,
          emissiveIntensity: 0.35,
        })
      );
      body.position.set(x, RACK_H / 2, z);
      body.castShadow    = true;
      body.receiveShadow = true;
      scene.add(body);
      rackMap.current.set(body, rack);

      // Edge outline for crisp definition
      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(RACK_W, RACK_H, RACK_D));
      const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x818cf8, linewidth: 1 }));
      outline.position.copy(body.position);
      scene.add(outline);

      // Top LED strip (bright)
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(RACK_W * 0.85, 0.07, RACK_D * 0.85),
        new THREE.MeshStandardMaterial({ color: 0xa5b4fc, emissive: 0xa5b4fc, emissiveIntensity: 3.0 })
      );
      strip.position.set(x, RACK_H + 0.035, z);
      scene.add(strip);

      // Side accent strips (left & right faces)
      [-1, 1].forEach((side) => {
        const sideStrip = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, RACK_H * 0.7, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x6366f1, emissive: 0x6366f1, emissiveIntensity: 2.0 })
        );
        sideStrip.position.set(x + side * (RACK_W / 2 - 0.02), RACK_H * 0.5, z);
        scene.add(sideStrip);
      });

      // Per-rack purple point light (glow halo)
      const rLight = new THREE.PointLight(0x818cf8, 4, 4.5);
      rLight.position.set(x, RACK_H + 1, z);
      scene.add(rLight);
      rackLights.push(rLight);

      // Front panel U-slots (alternating colors — green/amber status LEDs)
      const uCount = 8;
      for (let u = 0; u < uCount; u++) {
        const ledColor = u % 3 === 0 ? 0x4ade80 : u % 3 === 1 ? 0xfacc15 : 0x38bdf8;
        const led = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.05, 0.015),
          new THREE.MeshStandardMaterial({ color: ledColor, emissive: ledColor, emissiveIntensity: 2.5 })
        );
        const yPos = 0.4 + u * (RACK_H * 0.85 / uCount);
        led.position.set(x + RACK_W * 0.28, yPos, z - RACK_D * 0.5 + 0.008);
        scene.add(led);

        // Panel divider line
        const divider = new THREE.Mesh(
          new THREE.BoxGeometry(RACK_W * 0.7, 0.015, 0.01),
          new THREE.MeshStandardMaterial({ color: 0x312e81, emissive: 0x312e81, emissiveIntensity: 0.5 })
        );
        divider.position.set(x, yPos + 0.15, z - RACK_D * 0.5 + 0.006);
        scene.add(divider);
      }
    });

    // ── Room boundary walls (semi-transparent) ────────────────────────────────
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b, transparent: true, opacity: 0.08,
      roughness: 1, side: THREE.DoubleSide,
    });
    const wallH = RACK_H + 2;
    [
      { w: floorW, position: new THREE.Vector3(cx, wallH / 2, -0.5), rotY: 0 },
      { w: floorW, position: new THREE.Vector3(cx, wallH / 2, floorD - 0.5), rotY: 0 },
      { w: floorD, position: new THREE.Vector3(-0.5, wallH / 2, cz), rotY: Math.PI / 2 },
      { w: floorD, position: new THREE.Vector3(floorW - 0.5, wallH / 2, cz), rotY: Math.PI / 2 },
    ].forEach(({ w, position, rotY }) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, wallH), wallMat);
      wall.position.copy(position);
      wall.rotation.y = rotY;
      scene.add(wall);
    });

    // ── Raycaster hover / click ───────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();
    const rackMeshes = [...rackMap.current.keys()];

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouse.x =  (e.clientX - rect.left) / rect.width  * 2 - 1;
      mouse.y = -(e.clientY - rect.top)  / rect.height * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObjects(rackMeshes);
      if (hits.length > 0) {
        const mesh = hits[0].object as THREE.Mesh;
        if (hovered.current !== mesh) {
          if (hovered.current) {
            (hovered.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
            hovered.current.scale.set(1, 1, 1);
          }
          hovered.current = mesh;
          (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
          mesh.scale.set(1.03, 1.05, 1.03);
          el.style.cursor = "pointer";
        }
      } else {
        if (hovered.current) {
          (hovered.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
          hovered.current.scale.set(1, 1, 1);
          hovered.current = null;
          el.style.cursor = "default";
        }
      }
    };

    const onClick = () => {
      if (hovered.current && onRackClick) {
        onRackClick(rackMap.current.get(hovered.current) ?? null);
      }
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("click", onClick);

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Animate ───────────────────────────────────────────────────────────────
    let t = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      t += 0.004;
      // Breathe accent
      accent.intensity = 10 + Math.sin(t) * 3;
      // Alternate rack lights slightly
      rackLights.forEach((rl, i) => {
        rl.intensity = 3.5 + Math.sin(t * 1.5 + i * 1.2) * 1.5;
      });
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("click", onClick);
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, containers.length]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "default" }} />;
}
