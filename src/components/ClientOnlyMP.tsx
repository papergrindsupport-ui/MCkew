import { useEffect, useState } from "react";

export function MouseParticlesClient() {
  const [Component, setComponent] = useState<null | React.ComponentType<any>>(null);

  useEffect(() => {
    import("react-mouse-particles").then((mod) => {
      setComponent(() => mod.default);
    });
  }, []);

  if (!Component) return null;

  return <Component g={1} color="random" cull="MuiSvgIcon-root,MuiButton-root" level={6} />;
}
