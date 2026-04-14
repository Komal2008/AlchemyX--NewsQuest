import { Suspense, Component, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF, Center, Stage } from '@react-three/drei';
import { motion } from 'framer-motion';

type Avatar3DViewerProps = {
  src: string;
  autoRotate?: boolean;
  interactive?: boolean;
  className?: string;
};

const LoadingSpinner = () => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    className="w-8 h-8 border-2 rounded-full border-white/20 border-t-white/80"
  />
);

const Model = ({ src }: { src: string }) => {
  const { scene } = useGLTF(src);
  return <primitive object={scene} />;
};

class ModelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // swallow model load errors to keep the rest of the page alive
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center text-xs text-white/60">
          3D preview unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

/** Lightweight GLB previewer used inside Avatar Editor. */
export const Avatar3DViewer = ({ src, autoRotate = true, interactive = true, className }: Avatar3DViewerProps) => {
  useGLTF.preload(src);

  return (
    <div className={className ?? 'w-full h-full'}>
      <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><LoadingSpinner /></div>}>
        <Canvas camera={{ position: [0, 4.2, 15.0], fov: 34 }} shadows gl={{ alpha: true }} className="bg-transparent">
          <ModelErrorBoundary>
            <Suspense fallback={null}>
              <Stage
                environment="city"
                intensity={0.9}
                adjustCamera
                shadows
              >
                <Center disableZ>
                  <Model src={src} />
                </Center>
              </Stage>
            </Suspense>
          </ModelErrorBoundary>
          <OrbitControls
            enableZoom={interactive}
            enablePan={interactive}
            enableDamping
            dampingFactor={0.08}
            minDistance={9.5}
            maxDistance={22}
            minPolarAngle={0.9}
            maxPolarAngle={1.2}
            target={[0, 2.4, 0]}
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </Suspense>
    </div>
  );
};

export default Avatar3DViewer;
