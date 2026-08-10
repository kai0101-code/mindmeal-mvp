"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function YellowManModel() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    new GLTFLoader().load(`${import.meta.env.BASE_URL}models/YELLOW_MAN.glb`, gltf => {
      model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.traverse(child => {
        if (child instanceof THREE.Mesh) {
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
      renderer.render(scene, camera);
    });

    return () => {
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
  }, []);

  return <div className="yellow-man-model" ref={containerRef} role="img" aria-label="黃色人體模型" />;
}
