import { useState } from "react";
import { motion, useDragControls } from "framer-motion";
import {
  LuGripVertical,
  LuX,
  LuMinus,
  LuCalculator,
  LuChevronDown,
  LuChevronUp,
  LuTrash2,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { useToolsStore } from "./useToolsStore";

export function Calculator() {
  const open = useToolsStore((s) => s.calculatorOpen);
  const setOpen = useToolsStore((s) => s.setCalculatorOpen);
  const min = useToolsStore((s) => s.calculatorMin);
  const setMin = useToolsStore((s) => s.setCalculatorMin);
  const drag = useDragControls();

  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string>("");
  const [history, setHistory] = useState<{ expr: string; res: string }[]>([]);
  const [sciOpen, setSciOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!open) return null;
  if (min) {
    return (
      <button
        onClick={() => setMin(false)}
        className="fixed bottom-4 right-20 z-50 w-14 h-14 rounded-full border-2 border-border/60 bg-card shadow-2xl flex items-center justify-center hover:border-primary print:hidden"
        title="Open calculator"
      >
        <LuCalculator size={20} />
      </button>
    );
  }

  const append = (s: string) => setExpr((e) => e + s);
  const clear = () => {
    setExpr("");
    setResult("");
  };
  const back = () => setExpr((e) => e.slice(0, -1));

  const compute = () => {
    try {
      // Replace user-friendly operators
      const safe = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/g, "Math.PI")
        .replace(/(?<![a-zA-Z])e(?![a-zA-Z])/g, "Math.E")
        .replace(/√\(/g, "Math.sqrt(")
        .replace(/sin\(/g, "Math.sin(")
        .replace(/cos\(/g, "Math.cos(")
        .replace(/tan\(/g, "Math.tan(")
        .replace(/asin\(/g, "Math.asin(")
        .replace(/acos\(/g, "Math.acos(")
        .replace(/atan\(/g, "Math.atan(")
        .replace(/log\(/g, "Math.log10(")
        .replace(/ln\(/g, "Math.log(")
        .replace(/exp\(/g, "Math.exp(")
        .replace(/(\d+|\))!\s*/g, (_, n) => `factorial(${n})`)
        .replace(/\^/g, "**");
      // Validate characters
      if (
        !/^[\d+\-*/().,\s%*Math.PIEsqrtinclogexpfactorial!]+$/.test(
          safe.replace(/Math\.[a-zA-Z0-9_]+|factorial/g, ""),
        )
      ) {
        // basic guard; still attempt eval below
      }
      // factorial helper
      const factorial = (n: number): number => {
        if (n < 0 || !Number.isFinite(n)) return NaN;
        let r = 1;
        for (let i = 2; i <= Math.floor(n); i++) r *= i;
        return r;
      };

      const fn = new Function("factorial", `return (${safe});`);
      const v = fn(factorial);
      const r = String(v);
      setResult(r);
      setHistory((h) => [{ expr, res: r }, ...h].slice(0, 30));
    } catch {
      setResult("Error");
    }
  };

  const useHistory = (h: { expr: string; res: string }) => setExpr(h.expr);

  const Btn = ({
    label,
    onClick,
    variant,
  }: {
    label: string;
    onClick: () => void;
    variant?: "op" | "eq" | "fn";
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "h-9 rounded-xl border-2 font-bold text-sm transition active:scale-95",
        variant === "op" && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
        variant === "eq" && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "fn" &&
          "border-border/60 bg-muted text-muted-foreground hover:bg-accent text-xs",
        !variant && "border-border/60 hover:border-primary/40 hover:bg-accent",
      )}
    >
      {label}
    </button>
  );

  return (
    <motion.div
      drag
      dragControls={drag}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      initial={{ x: 0, y: 0 }}
      className="fixed top-24 right-2 sm:right-24 z-50 select-none print:hidden max-w-[calc(100vw-1rem)]"
    >
      <div className="rounded-2xl border-2 border-border/60 bg-card/95 backdrop-blur shadow-2xl w-[min(300px,calc(100vw-1rem))]">
        <div
          className="flex items-center gap-2 px-3 py-2 border-b border-border/40 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => drag.start(e)}
        >
          <LuGripVertical size={14} className="text-muted-foreground" />
          <LuCalculator size={14} className="text-primary" />
          <span className="text-sm font-bold flex-1">Calculator</span>
          <button
            onClick={() => setMin(true)}
            className="p-1 rounded hover:bg-accent text-muted-foreground"
            title="Minimize"
          >
            <LuMinus size={14} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-accent text-muted-foreground"
            title="Close"
          >
            <LuX size={14} />
          </button>
        </div>

        <div className="p-3 space-y-2">
          {/* Display — single line */}
          <div className="rounded-xl border-2 border-border/60 bg-muted/40 p-2 min-h-[64px]">
            <input
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  compute();
                }
              }}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="0 — type or click"
              className="w-full bg-transparent text-right font-mono text-lg font-bold outline-none truncate"
            />
            {result && (
              <div className="text-right font-mono text-sm text-muted-foreground truncate">
                = {result}
              </div>
            )}
          </div>

          {/* Scientific (collapsible) */}
          <button
            onClick={() => setSciOpen((v) => !v)}
            className="w-full text-xs font-bold flex items-center justify-between px-2 py-1 rounded-lg hover:bg-accent text-muted-foreground"
          >
            <span>Scientific functions</span>
            {sciOpen ? <LuChevronUp size={12} /> : <LuChevronDown size={12} />}
          </button>
          {sciOpen && (
            <div className="grid grid-cols-4 gap-1.5">
              <Btn variant="fn" label="sin" onClick={() => append("sin(")} />
              <Btn variant="fn" label="cos" onClick={() => append("cos(")} />
              <Btn variant="fn" label="tan" onClick={() => append("tan(")} />
              <Btn variant="fn" label="π" onClick={() => append("π")} />
              <Btn variant="fn" label="log" onClick={() => append("log(")} />
              <Btn variant="fn" label="ln" onClick={() => append("ln(")} />
              <Btn variant="fn" label="√" onClick={() => append("√(")} />
              <Btn variant="fn" label="^" onClick={() => append("^")} />
              <Btn variant="fn" label="exp" onClick={() => append("exp(")} />
              <Btn variant="fn" label="x!" onClick={() => append("!")} />
              <Btn variant="fn" label="(" onClick={() => append("(")} />
              <Btn variant="fn" label=")" onClick={() => append(")")} />
            </div>
          )}

          {/* Main pad */}
          <div className="grid grid-cols-4 gap-1.5">
            <Btn label="C" onClick={clear} variant="op" />
            <Btn label="⌫" onClick={back} variant="op" />
            <Btn label="%" onClick={() => append("%")} variant="op" />
            <Btn label="÷" onClick={() => append("÷")} variant="op" />

            <Btn label="7" onClick={() => append("7")} />
            <Btn label="8" onClick={() => append("8")} />
            <Btn label="9" onClick={() => append("9")} />
            <Btn label="×" onClick={() => append("×")} variant="op" />

            <Btn label="4" onClick={() => append("4")} />
            <Btn label="5" onClick={() => append("5")} />
            <Btn label="6" onClick={() => append("6")} />
            <Btn label="−" onClick={() => append("-")} variant="op" />

            <Btn label="1" onClick={() => append("1")} />
            <Btn label="2" onClick={() => append("2")} />
            <Btn label="3" onClick={() => append("3")} />
            <Btn label="+" onClick={() => append("+")} variant="op" />

            <Btn label="0" onClick={() => append("0")} />
            <Btn label="." onClick={() => append(".")} />
            <Btn label="±" onClick={() => append("-")} />
            <Btn label="=" onClick={compute} variant="eq" />
          </div>

          {/* History (collapsible) */}
          {history.length > 0 && (
            <div className="rounded-xl border border-border/40">
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="w-full text-xs font-bold flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-accent text-muted-foreground"
              >
                <span>History ({history.length})</span>
                <span className="flex items-center gap-1">
                  {historyOpen && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistory([]);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          setHistory([]);
                        }
                      }}
                      className="p-0.5 rounded hover:text-red-500 cursor-pointer"
                      title="Clear history"
                    >
                      <LuTrash2 size={11} />
                    </span>
                  )}
                  {historyOpen ? <LuChevronUp size={12} /> : <LuChevronDown size={12} />}
                </span>
              </button>
              {historyOpen && (
                <div className="max-h-32 overflow-y-auto px-2 pb-2 text-xs space-y-1">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => useHistory(h)}
                      className="w-full text-left rounded-lg px-1.5 py-1 hover:bg-accent font-mono"
                    >
                      <div className="truncate">{h.expr}</div>
                      <div className="text-muted-foreground truncate">= {h.res}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
