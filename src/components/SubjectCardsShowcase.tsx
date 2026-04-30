import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useVibeStore } from "@/stores/useVibeStore";

type BioLeafData = {
  id: number;
  variant: 0 | 1;
  hueRotate: number;
  saturate: number;
  idleRotate: number;
  idleScale: number;
  idleX: number;
  idleY: number;
  activeX: number;
  activeY: number;
  activeRotate: number;
  activeScale: number;
};

type PhysStarData = {
  id: number;
  type: "far" | "mid" | "near";
  left: number;
  top: number;
};

type PhysLineData = {
  id: number;
  y: number;
  delay: number;
};

function createRng(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createBioLeafData(id: number, rng: () => number): BioLeafData {
  return {
    id,
    variant: rng() > 0.5 ? 1 : 0,
    hueRotate: rng() * 40 - 20,
    saturate: 1 + rng() * 0.8,
    idleRotate: rng() * 360,
    idleScale: 0.5 + rng(),
    idleX: rng() * 60 - 30,
    idleY: rng() * 60 - 30,
    activeX: rng() * 800 - 400,
    activeY: rng() * 400 - 200,
    activeRotate: rng() * 180 - 90,
    activeScale: 0.8 + rng() * 0.6,
  };
}

function createBioLeaves(seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: 20 }, (_, index) => createBioLeafData(index, rng));
}

function createBioHoverLeaves(leaves: BioLeafData[]) {
  return leaves.map((leaf) => ({
    ...leaf,
    activeScale: 0.8 + Math.random() * 0.6,
  }));
}

function createBioResetLeaves(leaves: BioLeafData[]) {
  return leaves.map((leaf) => ({
    ...leaf,
    idleRotate: Math.random() * 360,
    idleScale: 0.5 + Math.random(),
    idleX: Math.random() * 60 - 30,
    idleY: Math.random() * 60 - 30,
  }));
}

function createPhysStars() {
  const farRng = createRng(11);
  const midRng = createRng(29);
  const nearRng = createRng(47);
  const stars: PhysStarData[] = [];
  let id = 0;

  for (let i = 0; i < 35; i++) {
    stars.push({ id: id++, type: "far", left: farRng() * 100, top: farRng() * 100 });
  }
  for (let i = 0; i < 20; i++) {
    stars.push({ id: id++, type: "mid", left: midRng() * 100, top: midRng() * 100 });
  }
  for (let i = 0; i < 12; i++) {
    stars.push({ id: id++, type: "near", left: nearRng() * 100, top: nearRng() * 100 });
  }

  return stars;
}

function createPhysLines(count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    y: rng(),
    delay: rng() * 2,
  }));
}

const INITIAL_BIO_LEAVES = createBioLeaves(2026);
const PHYS_STARS = createPhysStars();
const PHYS_BASE_LINES = createPhysLines(5, 71);
const PHYS_EXTRA_LINES = createPhysLines(6, 97);

function BioLeafSvg({ variant }: { variant: 0 | 1 }) {
  if (variant === 0) {
    return (
      <svg viewBox="0 0 1024 1024" aria-hidden="true">
        <path
          fill="#5AB286"
          d="M450.72 418.17c-42.29-21.86-144.5-220-171.65-198.22s-40.59 114.28 0.29 171.31 132 97 153.52 129.58 18.45 57.07 13.36 63.2S262.49 462 217.66 485.53s-28.41 84.69 17.56 132.54S427 651.39 455.57 672.76s32.72 55 20.49 55-145.88-32.38-192.77-24.15-68.25 39.89 0.12 73.42 180.26 8.87 199.28 28.21 6.8 28.54-7.47 29.58-110.14-4.91-143.78 0.24 6.21 56.07 23.57 69.3 80.59 19.24 98.94 16.15 36.67-26.58 51-20.48 3.14 45.88 8.25 53 46.92 9.1 53-0.09-10.26-37.71-0.09-51 32.65 11.16 66.28-1.13 109-70.55 111-104.2-132.52 27.76-167.19 26.8c-24.48-4-34.71-21.36-19.43-30.56s228.33-55.45 244.57-96.27 4-34.68-21.47-34.63S605.6 724.45 590.26 700 791 610 813.3 555.9s29.37-119.36-0.22-127.47-147.62 137.92-194.54 130.86-1.06-21.41 19.29-48 132.36-120.51 133.32-154.16 10.08-67.32-27.65-71.33-129.27 135.84-149.69 123.63 52.89-78.61 64-143.89S632.09 133 611.7 137.14s-19.37 4.11-19.34 22.47 10.33 79.52-1.85 114.21-13.14 60.18-23.35 54.08-10.27-43.83-4.2-73.41 23.3-92.83 13.07-112.19S545.27 48.53 467.8 68s-72.25 89.86-65 136.75 27.67 83.57 45.09 128.41 21.71 94.77 2.83 85.01z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 1024 1024" aria-hidden="true">
      <path
        fill="#00737F"
        d="M329.38 67.05c-26.8 9.6-72.36 203-56.59 258 27.91 14 80.76 23 97.78 40.31-32.83-2.62-100.33-1.11-100.33-1.11L281.79 478l112.44 19.84-103.86 19.72 31.86 101.18 107.23 5.72-85.31 30.19L406 756.76l118.66-2.94-85.22 26.58 40.32 58.16 91.58 13.23-48.86 22.91s47.69 61.08 89.49 70.68 78.92 19.75 93.5 12.85 45.83-88.11 47.68-124.78 1.18-64 1.18-64l-24.78 17.71 20.89-73.17-27-73.57L699 696.28l11.39-94.8-56.5-75.27L612 610l21.76-122.79-48-76.57-46.52 80.67L567 366.47l-57.65-81-36.85 75.16 19.53-108-60.57-63.69-24.8 57.59-4.33-93.66s-41.17-45.09-55-80.89c-4.77-15.56-17.95-4.93-17.95-4.93z"
      />
    </svg>
  );
}

function BioCard() {
  const [leaves, setLeaves] = useState(() => INITIAL_BIO_LEAVES);

  return (
    <div
      className="landing-bio-card"
      onMouseLeave={() => {
        setLeaves((current) => createBioResetLeaves(current));
      }}
    >
      <div className="landing-bio-text">Bio</div>

      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="landing-bio-leaf"
          style={
            {
              filter: `hue-rotate(${leaf.hueRotate}deg) saturate(${leaf.saturate})`,
              "--bio-idle-transform": `rotate(${leaf.idleRotate}deg) scale(${leaf.idleScale}) translate(${leaf.idleX}px, ${leaf.idleY}px)`,
              "--bio-active-transform": `translate(${leaf.activeX}px, ${leaf.activeY}px) rotate(${leaf.activeRotate}deg) scale(${leaf.activeScale})`,
            } as CSSProperties
          }
        >
          <BioLeafSvg variant={leaf.variant} />
        </div>
      ))}
    </div>
  );
}

function ChemCard() {
  const waveRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    let frame = 0;
    let t = 0;

    const animateWave = () => {
      t += 0.05;
      const y = 40 + Math.sin(t) * 8;
      waveRef.current?.setAttribute("d", `M0,${y} Q150,${y - 20} 300,${y} T600,${y} V80 H0 Z`);
      frame = window.requestAnimationFrame(animateWave);
    };

    frame = window.requestAnimationFrame(animateWave);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="landing-chem-card">
      <div className="landing-chem-text">Chem</div>

      <div className="landing-chem-liquid">
        <svg className="landing-chem-wave" viewBox="0 0 600 80" preserveAspectRatio="none">
          <path ref={waveRef} fill="currentColor" d="M0,40 Q150,20 300,40 T600,40 V80 H0 Z" />
        </svg>

        <div className="landing-chem-bubble" />
        <div className="landing-chem-bubble" />
        <div className="landing-chem-bubble" />
        <div className="landing-chem-bubble" />
        <div className="landing-chem-bubble" />
      </div>
    </div>
  );
}

function PhysCard() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`landing-phys-card${hovered ? " is-active is-fast" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {PHYS_STARS.map((star) => (
        <div
          key={star.id}
          className={`landing-phys-star ${star.type}`}
          style={{ left: `${star.left}%`, top: `${star.top}%` }}
        />
      ))}

      <div className="landing-phys-text">Phys</div>

      <div className="landing-phys-lines">
        {PHYS_BASE_LINES.map((line) => (
          <div
            key={line.id}
            className="landing-phys-line"
            style={
              {
                "--line-y": line.y,
                animationDelay: `${line.delay}s`,
              } as CSSProperties
            }
          />
        ))}

        {hovered &&
          PHYS_EXTRA_LINES.map((line) => (
            <div
              key={`extra-${line.id}`}
              className="landing-phys-line"
              style={
                {
                  "--line-y": line.y,
                  animationDelay: `${line.delay}s`,
                } as CSSProperties
              }
            />
          ))}
      </div>
    </div>
  );
}

type SubjectCardFrameProps = {
  href: "/smart-solve-bio" | "/smart-solve-chem" | "/smart-solve-phys";
  description: string;
  stageClassName: string;
  innerWidth: number;
  innerHeight: number;
  children: ReactNode;
};

function SubjectCardFrame({
  href,
  description,
  stageClassName,
  innerWidth,
  innerHeight,
  children,
}: SubjectCardFrameProps) {
  const scale = Math.min(280 / innerWidth, 300 / innerHeight);
  const isBoring = useVibeStore((s) => s.vibe) === "boring";

  return (
    <Link to={href} preload={false} className="block w-full max-w-[380px] self-start">
      <motion.div
        className="group rounded-[2rem] border-[3px] border-border bg-card/80 p-4 sm:p-5 shadow-[6px_6px_0_hsl(var(--border))] backdrop-blur-sm"
        whileHover={isBoring ? undefined : { y: -8, rotate: -1 }}
        transition={isBoring ? { duration: 0.15 } : { type: "spring", stiffness: 260, damping: 20 }}
      >
        <div
          className={`relative flex h-[330px] items-center justify-center overflow-hidden rounded-[1.5rem] border-[2.5px] border-border/70 ${stageClassName}`}
        >
          <div
            style={
              {
                width: `${innerWidth}px`,
                height: `${innerHeight}px`,
                transform: `scale(${scale})`,
                transformOrigin: "center",
              } as CSSProperties
            }
          >
            {children}
          </div>
        </div>

        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-250 group-hover:mt-4 group-hover:max-h-20 group-hover:opacity-100 group-focus-within:mt-4 group-focus-within:max-h-20 group-focus-within:opacity-100">
          <p className="text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
      </motion.div>
    </Link>
  );
}

export default function SubjectCardsShowcase() {
  const isBoring = useVibeStore((s) => s.vibe) === "boring";

  return (
    <section className="px-4 pt-14 sm:pt-20 pb-12 sm:pb-16">
      <motion.div
        className="max-w-6xl mx-auto"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={
          isBoring ? { duration: 0.2 } : { duration: 0.45, type: "spring", stiffness: 120 }
        }
      >
        <div className="subject-card-grid grid items-start gap-6">
          <SubjectCardFrame
            href="/smart-solve-chem"
            description="Tackle IGCSE Chemistry past papers with instant smart marking."
            stageClassName="landing-chem-stage"
            innerWidth={292}
            innerHeight={320}
          >
            <ChemCard />
          </SubjectCardFrame>
          <SubjectCardFrame
            href="/smart-solve-bio"
            description="Solve Biology questions and get detailed feedback in seconds."
            stageClassName="bg-[radial-gradient(circle_at_top,#e6f4ea,#b7e4c7)]"
            innerWidth={300}
            innerHeight={300}
          >
            <BioCard />
          </SubjectCardFrame>
          <SubjectCardFrame
            href="/smart-solve-phys"
            description="Master Physics problem-solving with guided hints and solutions."
            stageClassName="bg-[radial-gradient(circle_at_center,#111827,#020617)]"
            innerWidth={360}
            innerHeight={400}
          >
            <PhysCard />
          </SubjectCardFrame>
        </div>
      </motion.div>
    </section>
  );
}
