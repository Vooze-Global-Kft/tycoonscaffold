/**
 * Optional 3D hero scene (theme.scene = "three"): a low-poly hero object you
 * tap, with one orbiting satellite per business type owned. Rendered with
 * three.js on expo-gl. Falls back to the Skia scene if GL fails to start.
 *
 * To theme it, change colours in game.json, or replace buildHero() with a
 * loaded GLTF model (THREE's GLTFLoader + expo-asset) for a custom diorama.
 */
import { Canvas } from '@shopify/react-native-skia';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import * as THREE from 'three';
import { useGame } from '../../state/store';
import { crash } from '../../services/firebase';
import { useTheme } from '../theme';
import { Burst, FloatingNumber, SkiaScene } from './SkiaScene';

function buildHero(color: string, accent: string) {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 1);
  // Jitter vertices for a hand-made, low-poly look.
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.12;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
  }
  geo.computeVertexNormals();
  group.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6 })));
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.04, 8, 64),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6 }),
  );
  ring.rotation.x = Math.PI / 2.4;
  group.add(ring);
  return group;
}

export function ThreeScene() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const tapHero = useGame((s) => s.tapHero);
  const taps = useGame((s) => s.tapEvents);
  const ownedTypes = useGame((s) => cfg.businesses.filter((b) => s.game.venues[s.game.activeVenue].businesses[b.id].owned > 0).length);
  const [failed, setFailed] = useState(false);
  const spin = useRef(0);
  const satellitesWanted = useRef(ownedTypes);
  const frame = useRef<number | null>(null);
  satellitesWanted.current = ownedTypes;

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  if (failed) return <SkiaScene />;

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    try {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      // three.js expects a canvas element; expo-gl gives us only the context.
      const canvas = {
        width,
        height,
        style: {},
        clientWidth: width,
        clientHeight: height,
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: () => gl,
      } as unknown as HTMLCanvasElement;
      const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: true });
      renderer.setSize(width, height, false);
      renderer.setClearColor(new THREE.Color(t.c.background), 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 0.6, 5);
      camera.lookAt(0, 0, 0);
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const sun = new THREE.DirectionalLight(0xffffff, 1.4);
      sun.position.set(3, 4, 5);
      scene.add(sun);

      const hero = buildHero(t.c.primary, t.c.accent);
      scene.add(hero);
      const satellites: THREE.Mesh[] = [];
      const satGeo = new THREE.OctahedronGeometry(0.16);
      const satMat = new THREE.MeshStandardMaterial({ color: t.c.accent, flatShading: true });

      let last = Date.now();
      const render = () => {
        const now = Date.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        while (satellites.length < satellitesWanted.current) {
          const m = new THREE.Mesh(satGeo, satMat);
          satellites.push(m);
          scene.add(m);
        }
        spin.current *= 0.94;
        hero.rotation.y += dt * (0.4 + spin.current);
        hero.rotation.x = Math.sin(now / 2000) * 0.15;
        const s = 1 + Math.min(0.25, spin.current * 0.05);
        hero.scale.set(s, s, s);
        satellites.forEach((m, i) => {
          const a = now / 1500 + (i / satellites.length) * Math.PI * 2;
          m.position.set(Math.cos(a) * 1.6, Math.sin(a) * 0.4, Math.sin(a) * 1.6);
          m.rotation.y += dt * 2;
        });
        renderer.render(scene, camera);
        gl.endFrameEXP();
        frame.current = requestAnimationFrame(render);
      };
      render();
    } catch (e) {
      crash.record(e, 'three-scene');
      setFailed(true);
    }
  };

  const onTap = (e: GestureResponderEvent) => {
    spin.current = Math.min(spin.current + 3, 12);
    tapHero(e.nativeEvent.locationX, e.nativeEvent.locationY);
  };

  return (
    <Pressable style={styles.wrap} onPress={onTap}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} pointerEvents="none" />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {taps.map((e) => (
          <Burst key={e.id} x={e.x} y={e.y} color={t.c.accent} />
        ))}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {taps.map((e) => (
          <FloatingNumber key={e.id} {...e} symbol={t.strings.currencySymbol} color={t.c.text} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({ wrap: { height: 200, overflow: 'hidden' } });
