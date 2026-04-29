// Centralized icon shim: maps Lucide-style names to react-icons components.
// This lets the rest of the codebase keep using familiar names while sourcing
// every glyph from `react-icons` instead of `lucide-react`.
import type { IconType } from "react-icons";
import {
  LuArrowLeft,
  LuArrowRight,
  LuAtom,
  LuBookOpen,
  LuBrain,
  LuCheck,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuChevronUp,
  LuCircle,
  LuDna,
  LuFlame,
  LuFlaskConical,
  LuGamepad2,
  LuGraduationCap,
  LuGripVertical,
  LuHeart,
  LuMeh,
  LuMenu,
  LuMinus,
  LuMoon,
  LuPalette,
  LuPanelLeft,
  LuPencil,
  LuPlay,
  LuQuote,
  LuSearch,
  LuSparkles,
  LuSun,
  LuX,
  LuEllipsis,
} from "react-icons/lu";

export type LucideIcon = IconType;

export const ArrowLeft = LuArrowLeft;
export const ArrowRight = LuArrowRight;
export const Atom = LuAtom;
export const BookOpen = LuBookOpen;
export const Brain = LuBrain;
export const Check = LuCheck;
export const ChevronDown = LuChevronDown;
export const ChevronDownIcon = LuChevronDown;
export const ChevronLeft = LuChevronLeft;
export const ChevronLeftIcon = LuChevronLeft;
export const ChevronRight = LuChevronRight;
export const ChevronRightIcon = LuChevronRight;
export const ChevronUp = LuChevronUp;
export const Circle = LuCircle;
export const Dna = LuDna;
export const Flame = LuFlame;
export const FlaskConical = LuFlaskConical;
export const Gamepad2 = LuGamepad2;
export const GraduationCap = LuGraduationCap;
export const GripVertical = LuGripVertical;
export const Heart = LuHeart;
export const Meh = LuMeh;
export const Menu = LuMenu;
export const Minus = LuMinus;
export const Moon = LuMoon;
export const MoreHorizontal = LuEllipsis;
export const Palette = LuPalette;
export const PanelLeft = LuPanelLeft;
export const Pencil = LuPencil;
export const Play = LuPlay;
export const Quote = LuQuote;
export const Search = LuSearch;
export const Sparkles = LuSparkles;
export const Sun = LuSun;
export const X = LuX;
