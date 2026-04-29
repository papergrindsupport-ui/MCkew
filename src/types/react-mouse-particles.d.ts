declare module "react-mouse-particles" {
  import * as React from "react";

  export interface MouseParticlesProps {
    g?: number;
    color?: string;
    cull?: string;
    num?: number;
    radius?: number;
    life?: number;
    level?: number;
  }

  const MouseParticles: React.ComponentType<MouseParticlesProps>;
  export default MouseParticles;
}
