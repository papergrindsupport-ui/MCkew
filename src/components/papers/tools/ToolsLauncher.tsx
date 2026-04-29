import { lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuWrench,
  LuPalette,
  LuMinus,
  LuStickyNote,
  LuCalculator,
  LuAtom,
  LuX,
} from "react-icons/lu";
import { useToolsStore } from "./useToolsStore";
import { StylesModal } from "./StylesModal";
import { LineReader } from "./LineReader";
import { UserStylesApplier } from "./UserStylesApplier";

// Heavy floating tools are only mounted (and their JS only downloaded) once
// the user opens them at least once. Keeps the initial paper bundle small.
const Calculator = lazy(() => import("./Calculator").then((m) => ({ default: m.Calculator })));
const PeriodicTable = lazy(() =>
  import("./PeriodicTable").then((m) => ({ default: m.PeriodicTable })),
);
const ScratchBook = lazy(() => import("./ScratchBook").then((m) => ({ default: m.ScratchBook })));

type Item = {
  key: string;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
};

export function ToolsLauncher() {
  const setStylesOpen = useToolsStore((s) => s.setStylesOpen);
  const setCalc = useToolsStore((s) => s.setCalculatorOpen);
  const setPeriodic = useToolsStore((s) => s.setPeriodicOpen);
  const setScratchOpen = useToolsStore((s) => s.setScratchOpen);
  const lineOn = useToolsStore((s) => s.lineReaderOn);
  const setLineOn = useToolsStore((s) => s.setLineReaderOn);

  const [calcMounted, setCalcMounted] = useState(false);
  const [periodicMounted, setPeriodicMounted] = useState(false);
  const [scratchMounted, setScratchMounted] = useState(false);

  const [open, setOpen] = useState(false);

  const items: Item[] = [
    {
      key: "styles",
      title: "Styles",
      icon: <LuPalette size={14} />,
      onClick: () => setStylesOpen(true),
    },
    {
      key: "line",
      title: lineOn ? "Hide line reader" : "Line reader",
      icon: <LuMinus size={14} />,
      onClick: () => setLineOn(!lineOn),
      active: lineOn,
    },
    {
      key: "scratch",
      title: "Scratch paper",
      icon: <LuStickyNote size={14} />,
      onClick: () => {
        setScratchMounted(true);
        setScratchOpen(true);
      },
    },
    {
      key: "calc",
      title: "Calculator",
      icon: <LuCalculator size={14} />,
      onClick: () => {
        setCalcMounted(true);
        setCalc(true);
      },
    },
    {
      key: "periodic",
      title: "Periodic table",
      icon: <LuAtom size={14} />,
      onClick: () => {
        setPeriodicMounted(true);
        setPeriodic(true);
      },
    },
  ];

  // Tighter radius so buttons sit closer to the trigger (but still spaced apart)
  const radius = 50;
  const startAngle = -90;
  const sweep = 360;
  const step = sweep / items.length;

  return (
    <>
      <UserStylesApplier />

      <div className="relative inline-flex items-center justify-center print:hidden">
        {/* Trigger sits ABOVE navbar (navbar = z-50) so it's always tappable */}
        <motion.button
          type="button"
          title="Tools"
          aria-label="Tools"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          whileTap={{ scale: 0.9 }}
          className="relative z-[60] inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow cursor-pointer"
        >
          <motion.span
            animate={{ rotate: open ? 135 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="inline-flex"
          >
            {open ? <LuX size={16} /> : <LuWrench size={16} />}
          </motion.span>
        </motion.button>

        {/* Radial buttons: BEHIND the navbar (z below 50), but above page chrome */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="radial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 pointer-events-none z-[40]"
            >
              {items.map((it, i) => {
                const angle = ((startAngle + step * i) * Math.PI) / 180;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                return (
                  <motion.button
                    key={it.key}
                    type="button"
                    title={it.title}
                    onClick={() => {
                      it.onClick();
                      setOpen(false);
                    }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{ x, y, scale: 1, opacity: 1 }}
                    exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 22,
                      delay: i * 0.025,
                    }}
                    whileHover={{ scale: 1.18 }}
                    whileTap={{ scale: 0.92 }}
                    className={`pointer-events-auto absolute top-1/2 left-1/2 -mt-4 -ml-4 inline-flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg cursor-pointer transition-colors ${
                      it.active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    }`}
                  >
                    {it.icon}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <StylesModal />
      <Suspense fallback={null}>
        {calcMounted && <Calculator />}
        {periodicMounted && <PeriodicTable />}
        {scratchMounted && <ScratchBook />}
      </Suspense>
      <LineReader />
    </>
  );
}
