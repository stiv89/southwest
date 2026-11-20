import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html, Line, OrbitControls, useFBX } from "@react-three/drei";
import * as THREE from "three";
import {
  CONCOURSE_CENTER_X,
  GATE_X,
  WATCH_GATE_IDS,
  type ConcourseGateId,
} from "../../lib/concourse-layout";

const SWA_B737_URL = "/data/southwest-airlines-boeing-737/source/untitled.fbx";
const FUSELAGE_LENGTH = 7.8;

useFBX.preload(SWA_B737_URL);

export type RampGateId = ConcourseGateId;

export type RampSelection = { kind: "gate"; id: ConcourseGateId } | { kind: "flight"; id: "sw412" | "sw2847" };

export type RampSceneMode = "watch" | "gate-map";
export type RampMapView = "top" | "3d";
export type RampCameraFocus = "overview" | "pair";

export type GateLabel = {
  id: ConcourseGateId;
  detail: string;
  tone: "idle" | "amber" | "proposed" | "confirmed";
};

const BLUE = "#2a4fad";
const CONCRETE = "#e4eaf1";
const JOINT = "#c5d0dc";

function usePointerCursor() {
  const gl = useThree((state) => state.gl);
  return {
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      gl.domElement.style.cursor = "pointer";
    },
    onPointerOut: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      gl.domElement.style.cursor = "auto";
    },
  };
}

let normalizedJetTemplate: THREE.Group | null = null;

function normalizeFbxModel(fbx: THREE.Group) {
  if (normalizedJetTemplate) {
    return normalizedJetTemplate.clone(false) as THREE.Group;
  }

  const model = fbx.clone(true);
  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material || !("color" in material)) continue;
      material.side = THREE.FrontSide;
      const lit = material as THREE.MeshStandardMaterial;
      lit.color.set(BLUE);
      lit.metalness = 0.35;
      lit.roughness = 0.52;
      lit.emissive.set("#0a1a44");
      lit.emissiveIntensity = 0.12;
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const longest = Math.max(size.x, size.y, size.z);
  if (longest > 0) {
    model.scale.setScalar(FUSELAGE_LENGTH / longest);
  }
  model.rotation.set(-Math.PI / 2, 0, Math.PI / 2);

  const grounded = new THREE.Box3().setFromObject(model);
  model.position.y -= grounded.min.y;

  const group = new THREE.Group();
  group.add(model);
  normalizedJetTemplate = group;
  return group.clone(false) as THREE.Group;
}

function SouthwestJetMesh({ onLoaded }: { onLoaded: () => void }) {
  const fbx = useFBX(SWA_B737_URL);
  const body = useMemo(() => normalizeFbxModel(fbx), [fbx]);
  useEffect(() => {
    onLoaded();
  }, [body, onLoaded]);
  return <primitive object={body} />;
}

class JetLoadBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function SouthwestJetPlaceholder() {
  return (
    <mesh castShadow position={[0, 1.35, 0.2]} rotation={[0, 0.42, 0]}>
      <boxGeometry args={[7.4, 1.2, 1.6]} />
      <meshStandardMaterial color={BLUE} roughness={0.5} />
    </mesh>
  );
}

function SouthwestJet({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  const cursor = usePointerCursor();
  const [modelReady, setModelReady] = useState(false);
  return (
    <group
      position={[-13.5, 0.12, 7.4]}
      rotation={[0, 0.42, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      {...cursor}
    >
      {selected ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0.2]}>
          <ringGeometry args={[3.55, 3.85, 48]} />
          <meshBasicMaterial color="#16356f" />
        </mesh>
      ) : null}
      <JetLoadBoundary fallback={<SouthwestJetPlaceholder />}>
        {!modelReady ? <SouthwestJetPlaceholder /> : null}
        <Suspense fallback={<SouthwestJetPlaceholder />}>
          <SouthwestJetMesh onLoaded={() => setModelReady(true)} />
        </Suspense>
      </JetLoadBoundary>
      <ContactShadows position={[0, 0.02, 0.3]} opacity={0.38} scale={11} blur={2.4} far={3.2} color="#6d7c8d" />
    </group>
  );
}

function JetBridge({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh castShadow position={[0, 2.15, -12.4]}>
        <cylinderGeometry args={[0.72, 0.78, 2.5, 18]} />
        <meshStandardMaterial color="#f7f8fa" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 2.2, -9.15]}>
        <boxGeometry args={[1.2, 1.2, 5.4]} />
        <meshStandardMaterial color="#f3f6f9" roughness={0.55} />
      </mesh>
      <mesh position={[0, 2.45, -9.15]}>
        <boxGeometry args={[1.24, 0.18, 5.4]} />
        <meshStandardMaterial color="#b7c9dc" metalness={0.2} roughness={0.18} />
      </mesh>
      <mesh castShadow position={[0, 1.75, -6.35]}>
        <boxGeometry args={[1.65, 1.7, 1.35]} />
        <meshStandardMaterial color="#f7f8fa" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.85, -5.66]}>
        <boxGeometry args={[1.15, 0.7, 0.06]} />
        <meshStandardMaterial color="#c5d6e6" metalness={0.25} roughness={0.15} />
      </mesh>
    </group>
  );
}

function Terminal({ centerX, width }: { centerX: number; width: number }) {
  const windows = useMemo(() => {
    const start = centerX - width / 2 + 2.5;
    const step = (width - 5) / 25;
    return Array.from({ length: 26 }, (_, index) => start + index * step);
  }, [centerX, width]);
  return (
    <group>
      <mesh castShadow receiveShadow position={[centerX, 2.55, -15.6]}>
        <boxGeometry args={[width, 5.1, 5.6]} />
        <meshStandardMaterial color="#f6f7f9" roughness={0.72} />
      </mesh>
      <mesh castShadow position={[centerX, 5.2, -15.6]}>
        <boxGeometry args={[width + 1.2, 0.32, 6.2]} />
        <meshStandardMaterial color="#d5dce6" />
      </mesh>
      <mesh position={[centerX, 2.7, -12.72]}>
        <boxGeometry args={[width - 3, 2.35, 0.16]} />
        <meshStandardMaterial color="#c3d4e6" metalness={0.18} roughness={0.16} />
      </mesh>
      {windows.map((x) => (
        <mesh key={x} position={[x, 2.75, -12.6]}>
          <boxGeometry args={[1.05, 1.35, 0.08]} />
          <meshStandardMaterial color="#9eb6cc" metalness={0.28} roughness={0.12} />
        </mesh>
      ))}
      <Html position={[centerX, 6.15, -15.2]} center zIndexRange={[12, 0]}>
        <div className="ramp-terminal">Concourse C</div>
      </Html>
    </group>
  );
}

function Apron({
  onClear,
  centerX,
  width,
  showTaxiLine,
}: {
  onClear: () => void;
  centerX: number;
  width: number;
  showTaxiLine: boolean;
}) {
  const cursor = usePointerCursor();
  const joints = useMemo(() => {
    const count = Math.floor(width / 12);
    const start = centerX - width / 2 + 6;
    return Array.from({ length: count }, (_, index) => start + index * 12);
  }, [centerX, width]);
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, 0, 1]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onClear();
        }}
        onPointerOut={cursor.onPointerOut}
      >
        <planeGeometry args={[width, 58]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.92} />
      </mesh>
      {joints.map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, 2]}>
          <planeGeometry args={[0.07, 42]} />
          <meshStandardMaterial color={JOINT} />
        </mesh>
      ))}
      {showTaxiLine ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0.02, 11.2]}>
          <planeGeometry args={[width - 12, 0.18]} />
          <meshStandardMaterial color="#e2b340" />
        </mesh>
      ) : null}
    </group>
  );
}

function Stand({
  gate,
  selected,
  onSelect,
}: {
  gate: GateLabel & { x: number };
  selected: boolean;
  onSelect: () => void;
}) {
  const cursor = usePointerCursor();
  const outline = useMemo(() => {
    const width = 3.7;
    const depth = 5.4;
    return [
      new THREE.Vector3(-width, 0.07, -depth),
      new THREE.Vector3(width, 0.07, -depth),
      new THREE.Vector3(width, 0.07, depth),
      new THREE.Vector3(-width, 0.07, depth),
      new THREE.Vector3(-width, 0.07, -depth),
    ];
  }, []);

  return (
    <group position={[gate.x, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1.6]}>
        <planeGeometry args={[0.12, 15.5]} />
        <meshStandardMaterial color="#f7f9fb" />
      </mesh>
      {gate.tone === "amber" ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 2.1]}>
          <planeGeometry args={[8.4, 12.2]} />
          <meshStandardMaterial color="#f0b45a" transparent opacity={0.42} />
        </mesh>
      ) : null}
      {gate.tone === "confirmed" ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 1.4]}>
          <planeGeometry args={[7.6, 11]} />
          <meshStandardMaterial color="#8eadd9" transparent opacity={0.28} />
        </mesh>
      ) : null}
      {gate.tone === "proposed" || gate.tone === "confirmed" || gate.tone === "amber" || selected ? (
        <Line
          points={outline}
          color={gate.tone === "amber" ? "#d97706" : "#16356f"}
          dashed={gate.tone === "proposed"}
          dashSize={0.42}
          gapSize={0.26}
          lineWidth={gate.tone === "proposed" ? 2.5 : 3}
        />
      ) : null}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, 1.5]}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        {...cursor}
      >
        <planeGeometry args={[7.4, 11.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html position={[0, 4.55, -8.6]} center zIndexRange={[40, 0]}>
        <button
          type="button"
          className={[
            "ramp-label",
            gate.tone === "amber" ? "is-amber" : "",
            gate.tone === "proposed" ? "is-proposed" : "",
            gate.tone === "confirmed" ? "is-confirmed" : "",
            selected ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-testid={`ramp-gate-${gate.id}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          <strong>{gate.id}</strong>
          <span>{gate.detail}</span>
        </button>
      </Html>
    </group>
  );
}

const WATCH_TARGET = new THREE.Vector3(-2, 1, 1);

function CameraZoomGuard() {
  const camera = useThree((state) => state.camera);
  useFrame(() => {
    const ortho = camera as THREE.OrthographicCamera;
    if (!ortho.isOrthographicCamera || ortho.zoom >= 1) return;
    ortho.zoom = 12;
    ortho.updateProjectionMatrix();
  });
  return null;
}

function RampCamera({
  mode,
  mapView,
  focus,
  frameToken,
}: {
  mode: RampSceneMode;
  mapView: RampMapView;
  focus: RampCameraFocus;
  frameToken: number;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const pairCenter = (GATE_X.C14 + GATE_X.C19) / 2;

  const target = useMemo(() => {
    if (mode === "watch") return WATCH_TARGET;
    if (focus === "pair") return new THREE.Vector3(pairCenter, 0, 0);
    return new THREE.Vector3(CONCOURSE_CENTER_X, 0, 0);
  }, [mode, focus, pairCenter]);

  useLayoutEffect(() => {
  const fitZoom = (value: number, fallback = 12) => {
    if (size.width < 48 || size.height < 48) return fallback;
    return Math.max(5, value);
  };

    let zoom = 14;
    if (mode === "watch") {
      camera.position.set(26, 20, 32);
      camera.lookAt(WATCH_TARGET);
      zoom = fitZoom(Math.min(size.width / 58, size.height / 36));
    } else if (focus === "pair") {
      if (mapView === "top") {
        camera.position.set(pairCenter, 54, 0.001);
        camera.lookAt(pairCenter, 0, 0);
        zoom = fitZoom(Math.min(size.width / 44, size.height / 38));
      } else {
        camera.position.set(pairCenter + 10, 36, 36);
        camera.lookAt(pairCenter, 0, 0);
        zoom = fitZoom(Math.min(size.width / 52, size.height / 40));
      }
    } else if (mapView === "top") {
      camera.position.set(CONCOURSE_CENTER_X, 58, 0.001);
      camera.lookAt(CONCOURSE_CENTER_X, 0, 0);
      zoom = fitZoom(Math.min(size.width / 78, size.height / 54));
    } else {
      camera.position.set(CONCOURSE_CENTER_X + 14, 48, 52);
      camera.lookAt(CONCOURSE_CENTER_X, 0, 0);
      zoom = fitZoom(Math.min(size.width / 84, size.height / 56));
    }
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }, [camera, size, mode, mapView, focus, frameToken, pairCenter]);

  const minZoom =
    size.width < 48 || size.height < 48
      ? 5
      : mode === "watch"
        ? Math.max(5, Math.min(size.width / 70, size.height / 44))
        : Math.max(5, Math.min(size.width / 92, size.height / 64));
  const maxZoom =
    size.width < 48 || size.height < 48
      ? 24
      : mode === "watch"
        ? Math.max(minZoom + 1, Math.min(size.width / 46, size.height / 28))
        : Math.max(minZoom + 1, Math.min(size.width / 38, size.height / 30));

  return <OrbitControls enableRotate={false} enablePan={false} minZoom={minZoom} maxZoom={maxZoom} target={target} />;
}

function Scene({
  mode,
  mapView,
  cameraFocus,
  frameToken,
  gates,
  selection,
  arrivalLabel,
  aircraftCaption,
  showFlightTags,
  onSelect,
}: {
  mode: RampSceneMode;
  mapView: RampMapView;
  cameraFocus: RampCameraFocus;
  frameToken: number;
  gates: (GateLabel & { x: number })[];
  selection: RampSelection | null;
  arrivalLabel: string;
  aircraftCaption: string;
  showFlightTags: boolean;
  onSelect: (selection: RampSelection | null) => void;
}) {
  const aircraftSelected = selection?.kind === "flight" && selection.id === "sw412";
  const arrivalSelected = selection?.kind === "flight" && selection.id === "sw2847";
  const terminalWidth = mode === "gate-map" ? 72 : 44;
  const terminalCenter = mode === "gate-map" ? CONCOURSE_CENTER_X : 0;
  const apronWidth = mode === "gate-map" ? 108 : 80;
  const apronCenter = mode === "gate-map" ? CONCOURSE_CENTER_X : 0;
  return (
    <>
      <color attach="background" args={["#d7e3ef"]} />
      <hemisphereLight args={["#f5f9ff", "#c5ced8", 0.82]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        position={[18, 26, 14]}
        intensity={1.45}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={100}
        shadow-camera-left={mode === "gate-map" ? -56 : -30}
        shadow-camera-right={mode === "gate-map" ? 40 : 30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0006}
      />
      <directionalLight position={[-14, 12, -6]} intensity={0.32} />
      <RampCamera mode={mode} mapView={mapView} focus={cameraFocus} frameToken={frameToken} />
      <CameraZoomGuard />
      <Apron
        onClear={() => onSelect(null)}
        centerX={apronCenter}
        width={apronWidth}
        showTaxiLine={mode === "watch"}
      />
      <Terminal centerX={terminalCenter} width={terminalWidth} />
      {gates.map((gate) => (
        <JetBridge key={`bridge-${gate.id}`} x={gate.x} />
      ))}
      {gates.map((gate) => (
        <Stand
          key={gate.id}
          gate={gate}
          selected={selection?.kind === "gate" && selection.id === gate.id}
          onSelect={() => onSelect({ kind: "gate", id: gate.id })}
        />
      ))}
      <SouthwestJet selected={aircraftSelected} onSelect={() => onSelect({ kind: "flight", id: "sw412" })} />
      {showFlightTags ? (
        <>
          <Html position={[-17.2, 5.8, 1.2]} center zIndexRange={[40, 0]}>
            <button
              type="button"
              className={["ramp-label", "ramp-label--flight", arrivalSelected ? "is-selected" : ""]
                .filter(Boolean)
                .join(" ")}
              data-testid="ramp-arrival"
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ kind: "flight", id: "sw2847" });
              }}
            >
              <strong>SW 2847</strong>
              <span>{arrivalLabel}</span>
            </button>
          </Html>
          <Html position={[-11.2, 5.4, 9.2]} center zIndexRange={[50, 0]}>
            <button
              type="button"
              className={["ramp-label", "ramp-label--flight", aircraftSelected ? "is-selected" : ""]
                .filter(Boolean)
                .join(" ")}
              data-testid="ramp-aircraft"
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ kind: "flight", id: "sw412" });
              }}
            >
              <strong>SW 412</strong>
              <span>{aircraftCaption}</span>
            </button>
          </Html>
        </>
      ) : null}
    </>
  );
}

function buildGateRows(labels: GateLabel[], visibleGateIds: ConcourseGateId[]) {
  return visibleGateIds.map((id) => {
    const label = labels.find((item) => item.id === id);
    return {
      id,
      x: GATE_X[id],
      detail: label?.detail ?? "Available",
      tone: label?.tone ?? "idle",
    };
  });
}

export function RampScene({
  labels,
  arrivalLabel,
  selection,
  onSelect,
  mode = "watch",
  mapView = "3d",
  cameraFocus = "overview",
  frameToken = 0,
  visibleGateIds = WATCH_GATE_IDS,
  showFlightTags = true,
  aircraftCaption = "On stand C14",
}: {
  labels: GateLabel[];
  arrivalLabel: string;
  selection: RampSelection | null;
  onSelect: (selection: RampSelection | null) => void;
  mode?: RampSceneMode;
  mapView?: RampMapView;
  cameraFocus?: RampCameraFocus;
  frameToken?: number;
  visibleGateIds?: ConcourseGateId[];
  showFlightTags?: boolean;
  aircraftCaption?: string;
}) {
  const gates = buildGateRows(labels, visibleGateIds);

  return (
    <div className="ramp-stage" data-testid="ramp-scene">
      <Canvas
        orthographic
        shadows
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
        camera={{ position: [26, 20, 32], zoom: 12, near: 0.1, far: 300 }}
        dpr={[1, 1.6]}
        style={{ width: "100%", height: "100%", display: "block" }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ gl, camera }) => {
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          camera.lookAt(mode === "watch" ? WATCH_TARGET : new THREE.Vector3(CONCOURSE_CENTER_X, 0, 0));
        }}
        onPointerMissed={() => onSelect(null)}
      >
        <Suspense fallback={null}>
          <Scene
            mode={mode}
            mapView={mapView}
            cameraFocus={cameraFocus}
            frameToken={frameToken}
            gates={gates}
            selection={selection}
            arrivalLabel={arrivalLabel}
            aircraftCaption={aircraftCaption}
            showFlightTags={showFlightTags}
            onSelect={onSelect}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

