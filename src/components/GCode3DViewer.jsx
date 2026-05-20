import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── colours ─────────────────────────────────────────────────────
const COL_RAPID  = new THREE.Color(0xf97316); // orange   – G0
const COL_CUT    = new THREE.Color(0x6366f1); // indigo   – G1
const COL_BG     = new THREE.Color(0x0d1117);
const COL_GRID   = new THREE.Color(0x1e2736);
const COL_GRID2  = new THREE.Color(0x161d27);

// Build toolpath geometry from [{cmd,x,y,z}]
function buildToolpathLines(toolpath) {
  const rapidPts = [];
  const cutPts   = [];
  let prev = { x: 0, y: 0, z: 0 };

  for (const pt of toolpath) {
    const cur = { x: pt.x ?? prev.x, y: pt.y ?? prev.y, z: pt.z ?? prev.z };
    if (pt.cmd === 'G0') {
      rapidPts.push(prev.x, prev.z, prev.y);  // three.js: Y up → swap y/z
      rapidPts.push(cur.x,  cur.z,  cur.y);
    } else {
      cutPts.push(prev.x, prev.z, prev.y);
      cutPts.push(cur.x,  cur.z,  cur.y);
    }
    prev = cur;
  }

  function makeLines(pts, color) {
    if (!pts.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    return new THREE.LineSegments(geo, mat);
  }

  return {
    rapid: makeLines(rapidPts, COL_RAPID),
    cut:   makeLines(cutPts,   COL_CUT),
  };
}

// Bounding box centre of toolpath
function toolpathCentre(toolpath) {
  if (!toolpath.length) return { cx: 0, cy: 0, span: 50 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of toolpath) {
    if (p.x != null) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); }
    if (p.y != null) { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  }
  return {
    cx:   (minX + maxX) / 2,
    cy:   (minY + maxY) / 2,
    span: Math.max(maxX - minX, maxY - minY, 10),
  };
}

export default function GCode3DViewer({ toolpath }) {
  const mountRef    = useRef(null);
  const stateRef    = useRef({}); // holds renderer / scene / camera / etc.
  const [playing,   setPlaying]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const playingRef  = useRef(false);
  const progressRef = useRef(0);

  // ── init scene (runs once) ──────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const W = container.clientWidth  || 600;
    const H = container.clientHeight || 420;

    // --- renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // --- scene
    const scene = new THREE.Scene();
    scene.background = COL_BG;
    scene.fog = new THREE.FogExp2(COL_BG, 0.005);

    // --- camera
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.5, 4000);
    camera.position.set(80, 90, 130);

    // --- lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0x8899ff, 1.4);
    sun.position.set(120, 200, 100);
    sun.castShadow = true;
    scene.add(sun);
    const fill = new THREE.PointLight(0x6366f1, 3, 600);
    fill.position.set(40, 80, 60);
    scene.add(fill);

    // --- bed grid
    const gridHelper = new THREE.GridHelper(400, 40, COL_GRID, COL_GRID2);
    gridHelper.position.set(50, -0.5, 40);
    scene.add(gridHelper);

    // bed plane
    const bedMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshLambertMaterial({ color: 0x111827, side: THREE.DoubleSide })
    );
    bedMesh.rotation.x = -Math.PI / 2;
    bedMesh.position.set(50, -1, 40);
    bedMesh.receiveShadow = true;
    scene.add(bedMesh);

    // --- axes helper (at origin)
    scene.add(new THREE.AxesHelper(20));

    // --- orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance   = 15;
    controls.maxDistance   = 800;
    controls.target.set(50, 0, 40);
    controls.update();

    // --- tool head group
    const toolGroup = new THREE.Group();
    // shaft
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 14, 16),
      new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 120 })
    );
    shaft.position.y = 10;
    toolGroup.add(shaft);
    // collet
    const collet = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 1.6, 5, 16),
      new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 80 })
    );
    collet.position.y = 2.5;
    toolGroup.add(collet);
    // tip
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 7, 16),
      new THREE.MeshPhongMaterial({ color: 0x6366f1, shininess: 200, emissive: 0x2233aa, emissiveIntensity: 0.4 })
    );
    tip.position.y = -3.5;
    tip.rotation.z  = Math.PI;
    toolGroup.add(tip);
    // glow sphere
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(5, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.12 })
    );
    glow.position.y = -7;
    toolGroup.add(glow);
    // point light at tip
    const tipLight = new THREE.PointLight(0x818cf8, 4, 60);
    tipLight.position.y = -7;
    toolGroup.add(tipLight);

    toolGroup.visible = false;
    scene.add(toolGroup);

    // --- animation state
    const anim = { segments: [], segIdx: 0, segT: 0, speed: 0.012 };

    // --- render loop
    let rafId;
    function animate() {
      rafId = requestAnimationFrame(animate);
      controls.update();

      // advance toolhead animation
      if (playingRef.current && anim.segments.length) {
        const seg = anim.segments[anim.segIdx];
        anim.segT += anim.speed * (seg.rapid ? 3 : 1);
        if (anim.segT >= 1) {
          anim.segT = 0;
          anim.segIdx = (anim.segIdx + 1) % anim.segments.length;
          if (anim.segIdx === 0) {
            playingRef.current = false;
            setPlaying(false);
            progressRef.current = 1;
            setProgress(1);
          }
        }
        const s  = anim.segments[anim.segIdx];
        const px = s.x1 + (s.x2 - s.x1) * anim.segT;
        const py = s.y1 + (s.y2 - s.y1) * anim.segT;
        const pz = s.z1 + (s.z2 - s.z1) * anim.segT;
        // Three.js Y-up: gcode x→x, gcode y→z, gcode z→y
        toolGroup.position.set(px, py, pz);

        const total  = anim.segments.length;
        const done   = anim.segIdx + anim.segT;
        progressRef.current = done / total;
        setProgress(done / total);
      }

      renderer.render(scene, camera);
    }
    animate();

    // --- resize
    const ro = new ResizeObserver(() => {
      const W2 = container.clientWidth;
      const H2 = container.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    });
    ro.observe(container);

    stateRef.current = { scene, camera, controls, renderer, toolGroup, anim, rafId: null };

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // ── update toolpath whenever it changes ─────────────────────
  useEffect(() => {
    const { scene, anim, toolGroup, controls, camera } = stateRef.current;
    if (!scene || !toolpath?.length) return;

    // remove old path lines + sphere mesh
    ['__toolpath__', '__shapemesh__'].forEach(name => {
      const old = scene.getObjectByName(name);
      if (old) { scene.remove(old); old.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); }
    });

    // build new lines
    const { rapid, cut } = buildToolpathLines(toolpath);
    const group = new THREE.Group();
    group.name  = '__toolpath__';
    if (rapid) group.add(rapid);
    if (cut)   group.add(cut);
    scene.add(group);

    // sphere: add a translucent wireframe reference mesh
    const isSphere = toolpath.some(p => p._sphere);
    // detect sphere by checking if passes go to different Z heights AND form circles
    const zValues = [...new Set(toolpath.filter(p => p.cmd === 'G1').map(p => Math.round(p.z)))];
    if (zValues.length >= 4 && zValues.some(z => z > 5)) {
      // looks like a sphere (multiple cut heights) — find radius
      const maxR = Math.max(...toolpath.map(p => Math.hypot(p.x || 0, p.y || 0)));
      const maxZ = Math.max(...toolpath.map(p => p.z || 0));
      const sphereR = maxR;
      const sphereGroup = new THREE.Group();
      sphereGroup.name = '__shapemesh__';
      // wireframe sphere
      const geo = new THREE.SphereGeometry(sphereR, 24, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0x6366f1, wireframe: true, transparent: true, opacity: 0.08 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, sphereR, 0); // centre it at radius height (three.js y-up)
      sphereGroup.add(mesh);
      // solid tinted inner
      const innerGeo = new THREE.SphereGeometry(sphereR * 0.98, 24, 16);
      const innerMat = new THREE.MeshLambertMaterial({ color: 0x312e81, transparent: true, opacity: 0.06, side: THREE.FrontSide });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.copy(mesh.position);
      sphereGroup.add(inner);
      scene.add(sphereGroup);
    }

    // build animation segments (prev→cur for each step, swapping y/z)
    anim.segments = [];
    let prev = { x: 0, y: 0, z: 0 };
    for (const pt of toolpath) {
      const cur = { x: pt.x ?? prev.x, y: pt.y ?? prev.y, z: pt.z ?? prev.z };
      anim.segments.push({
        x1: prev.x, y1: prev.z, z1: prev.y,  // three.js coords
        x2: cur.x,  y2: cur.z,  z2: cur.y,
        rapid: pt.cmd === 'G0',
      });
      prev = cur;
    }
    anim.segIdx = 0;
    anim.segT   = 0;
    toolGroup.visible = true;

    // position camera to frame the shape
    const { cx, cy, span } = toolpathCentre(toolpath);
    controls.target.set(cx, 0, cy);
    camera.position.set(cx + span * 1.1, span * 1.0, cy + span * 1.6);
    controls.update();

    // reset play state
    playingRef.current  = false;
    progressRef.current = 0;
    setPlaying(false);
    setProgress(0);
  }, [toolpath]);

  // ── play / pause / reset ────────────────────────────────────
  const handlePlay = useCallback(() => {
    const { anim } = stateRef.current;
    if (!anim?.segments?.length) return;
    if (progressRef.current >= 1) { anim.segIdx = 0; anim.segT = 0; progressRef.current = 0; setProgress(0); }
    playingRef.current = !playingRef.current;
    setPlaying(v => !v);
  }, []);

  const handleReset = useCallback(() => {
    const { anim, toolGroup, controls, camera } = stateRef.current;
    playingRef.current  = false;
    progressRef.current = 0;
    setPlaying(false);
    setProgress(0);
    if (anim) { anim.segIdx = 0; anim.segT = 0; }
    if (toolGroup) toolGroup.position.set(0, 0, 0);
    if (toolpath?.length) {
      const { cx, cy, span } = toolpathCentre(toolpath);
      controls.target.set(cx, 0, cy);
      camera.position.set(cx + span * 1.1, span, cy + span * 1.6);
      controls.update();
    }
  }, [toolpath]);

  const pct = Math.round(progress * 100);

  return (
    <div className="gcode-3d-wrap">
      {/* 3D canvas */}
      <div ref={mountRef} className="gcode-3d-canvas" />

      {/* overlay controls */}
      <div className="gcode-3d-controls">
        <button className="gcode-3d-btn" onClick={handlePlay} title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button className="gcode-3d-btn" onClick={handleReset} title="Reset">↺</button>
        <div className="gcode-3d-progress-wrap">
          <div className="gcode-3d-progress-bar" style={{ width: `${pct}%` }} />
        </div>
        <span className="gcode-3d-pct">{pct}%</span>
      </div>

      {/* legend */}
      <div className="gcode-3d-legend">
        <span className="gcode-3d-legend-dot rapid" />G0 Rapid
        <span className="gcode-3d-legend-dot cut" />G1 Cut
      </div>

      {/* hint */}
      {!toolpath?.length && (
        <div className="gcode-3d-empty">
          <div className="gcode-3d-empty-icon">⬡</div>
          <p>3D toolpath will appear here</p>
          <small>Drag to orbit · Scroll to zoom</small>
        </div>
      )}
      {toolpath?.length > 0 && (
        <div className="gcode-3d-hint">Drag to orbit · Scroll to zoom · Right-drag to pan</div>
      )}
    </div>
  );
}
