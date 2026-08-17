"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const modelCache = new Map<string, THREE.Object3D>();
const modelLoads = new Map<string, Promise<THREE.Object3D>>();

function modelFileForGender(gender: string) {
  return gender === "女性" ? "FEMALE_MANNEQUIN.glb" : "YELLOW_MAN.glb";
}

function loadModelFile(modelFile: string) {
  const cached = modelCache.get(modelFile);
  if (cached) return Promise.resolve(cached);
  const pending = modelLoads.get(modelFile);
  if (pending) return pending;
  const load = new Promise<THREE.Object3D>((resolve, reject) => {
    new GLTFLoader().load(`${import.meta.env.BASE_URL}models/${modelFile}`, gltf => {
      modelCache.set(modelFile, gltf.scene);
      resolve(gltf.scene);
    }, undefined, reject);
  });
  modelLoads.set(modelFile, load);
  load.finally(() => modelLoads.delete(modelFile));
  return load;
}

export async function preloadYellowManModel(gender: string) {
  try {
    await loadModelFile(modelFileForGender(gender));
  } catch {
    // The component will retry and retain the surrounding artwork if loading fails.
  }
}

function smoothFemaleAxillaNormals(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const index = geometry.getIndex();
  if (!position || !normal || !index) return;

  const weights = new Float32Array(position.count);
  const selected: number[] = [];
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const x = Math.abs(position.getX(vertex));
    const y = position.getY(vertex);
    const horizontal = (x - 0.18) / 0.075;
    const vertical = (y - 0.48) / 0.15;
    const radius = Math.sqrt(horizontal * horizontal + vertical * vertical);
    if (radius < 1) {
      const feather = 1 - radius;
      weights[vertex] = feather * feather;
      selected.push(vertex);
    }
  }

  const neighbours = new Map<number, Set<number>>();
  selected.forEach(vertex => neighbours.set(vertex, new Set<number>()));
  const connect = (from: number, first: number, second: number) => {
    const list = neighbours.get(from);
    if (!list) return;
    list.add(first);
    list.add(second);
  };
  for (let offset = 0; offset < index.count; offset += 3) {
    const a = index.getX(offset);
    const b = index.getX(offset + 1);
    const c = index.getX(offset + 2);
    connect(a, b, c);
    connect(b, a, c);
    connect(c, a, b);
  }

  const original = new Float32Array(position.count * 3);
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    original[vertex * 3] = normal.getX(vertex);
    original[vertex * 3 + 1] = normal.getY(vertex);
    original[vertex * 3 + 2] = normal.getZ(vertex);
  }

  let current = original.slice();
  for (let pass = 0; pass < 20; pass += 1) {
    const next = current.slice();
    selected.forEach(vertex => {
      const list = neighbours.get(vertex);
      if (!list?.size) return;
      let nx = current[vertex * 3];
      let ny = current[vertex * 3 + 1];
      let nz = current[vertex * 3 + 2];
      let samples = 1;
      list.forEach(neighbour => {
        nx += current[neighbour * 3];
        ny += current[neighbour * 3 + 1];
        nz += current[neighbour * 3 + 2];
        samples += 1;
      });
      nx /= samples;
      ny /= samples;
      nz /= samples;
      const length = Math.hypot(nx, ny, nz) || 1;
      next[vertex * 3] = nx / length;
      next[vertex * 3 + 1] = ny / length;
      next[vertex * 3 + 2] = nz / length;
    });
    current = next;
  }

  selected.forEach(vertex => {
    const blend = weights[vertex] * 0.985;
    const offset = vertex * 3;
    let nx = original[offset] * (1 - blend) + current[offset] * blend;
    let ny = original[offset + 1] * (1 - blend) + current[offset + 1] * blend;
    let nz = original[offset + 2] * (1 - blend) + current[offset + 2] * blend;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    normal.setXYZ(vertex, nx, ny, nz);
  });
  normal.needsUpdate = true;
}

export default function YellowManModel({ gender }: { gender: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isFemale = gender === "女性";

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b8a8, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xeaff00, 1.8);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    let model: THREE.Object3D | null = null;
    let animationFrame = 0;

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let active = true;
    const modelFile = modelFileForGender(isFemale ? "女性" : "男性");
    const attachModel = (source: THREE.Object3D) => {
      if (!active) return;
      model = source.clone(true);
      model.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry = child.geometry.clone();
          child.material = Array.isArray(child.material) ? child.material.map(material => material.clone()) : child.material.clone();
        }
      });
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (isFemale) {
            smoothFemaleAxillaNormals(child.geometry);
          }
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });

      scene.add(model);

      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const heightDistance = size.y / (2 * Math.tan(verticalFov / 2));
      const widthDistance = size.x / (2 * Math.tan(verticalFov / 2) * Math.max(camera.aspect, 0.1));
      const distance = Math.max(heightDistance, widthDistance) * 1.08;
      camera.position.set(0, size.y * 0.015, distance);
      camera.near = Math.max(0.01, distance / 100);
      camera.far = distance * 100;
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      const animate = () => {
        if (model) model.rotation.y += 0.006;
        renderer.render(scene, camera);
        animationFrame = requestAnimationFrame(animate);
      };
      animate();
    };
    const cachedModel = modelCache.get(modelFile);
    if (cachedModel) attachModel(cachedModel);
    else loadModelFile(modelFile).then(attachModel).catch(() => undefined);

    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      if (model) {
        model.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => material.dispose());
          }
        });
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [isFemale]);

  return <div className={`yellow-man-model ${isFemale ? "female-man-model" : "male-man-model"}`} ref={containerRef} role="img" aria-label={isFemale ? "黃色女性人體模型" : "黃色男性人體模型"}><span className="body-orbit-front" aria-hidden="true" /><span className="body-orbit-marker" aria-hidden="true" /></div>;
}
