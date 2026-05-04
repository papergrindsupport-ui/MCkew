// Hardcoded question data with rich content blocks.
// Each question is linked to a paper via paperId (format: "subject-year-session-variant").

import type { Difficulty, Priority, TargetGrade } from "./topics";

/* ============== Rich Text ==============
 * A run is a styled span. Multiple runs form a block.
 * `latex` runs are rendered with KaTeX (inline).
 * `br` inserts a line break.
 * `linebreak` block creates a paragraph break.
 */

export type InlineMark =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "sub"
  | "sup"
  | "highlight"
  | "muted"
  | "code";

export interface TextRun {
  type: "text";
  text: string;
  marks?: InlineMark[];
}
export interface LatexRun {
  type: "latex";
  tex: string;
  display?: boolean; // block math
}
export interface BreakRun {
  type: "br";
}
export type Run = TextRun | LatexRun | BreakRun;

export type RichBlockKind = "p" | "h1" | "h2" | "h3";
export interface RichBlock {
  kind?: RichBlockKind; // default 'p'
  align?: "left" | "center" | "right";
  runs: Run[];
}
export interface ListBlock {
  kind: "ul" | "ol";
  items: Run[][]; // each item is a sequence of inline runs
}
export type RichNode = RichBlock | ListBlock;
export type RichText = RichNode[];

/* ============== Data Blocks (images, tables, charts) ============== */

export type ImageType = "Photograph" | "Diagram";
export type ImageSize = "sm" | "md" | "lg";

export interface ImageBlock {
  type: "image";
  src: string;
  alt: string;
  imageType: ImageType;
  size?: ImageSize;
  title?: RichText;
  titleCentered?: boolean;
  caption?: RichText;
}

export interface TableCell {
  content: RichText;
  isHeader?: boolean;
  colSpan?: number;
  rowSpan?: number;
  align?: "left" | "center" | "right";
}
export interface TableBlock {
  type: "table";
  caption?: RichText;
  // 2D grid; group rows by `subRowGroup` label to render sub-row headings.
  rows: TableCell[][];
  // Optional sub-column groupings: e.g. [{ label, span: 2 }, { label, span: 3 }]
  columnGroups?: { label: RichText; span: number }[];
  // Optional sub-row groupings: pairs of (rowIndex -> heading)
  rowGroups?: { startRow: number; label: RichText }[];
  key?: { symbol: string; meaning: RichText }[];
}

export type ChartKind = "bar" | "line" | "pie";
export type LineStyle = "smooth" | "straight" | "best-fit";

export interface ChartSeries {
  name: string;
  // For bar/line: array of {x, y}. For pie: array of {x:label, y:value}.
  data: { x: string | number; y: number }[];
  lineStyle?: LineStyle; // line charts only
}
export interface ChartBlock {
  type: "chart";
  chart: ChartKind;
  title?: RichText;
  xLabel?: string;
  yLabel?: string;
  series: ChartSeries[];
  showLegend?: boolean;
}

export type DataBlock = ImageBlock | TableBlock | ChartBlock;

/* A row of data blocks rendered inline (multiple side-by-side), or a single block. */
export interface DataRow {
  blocks: DataBlock[]; // length 1 = stacked normally; >1 = side-by-side row
}

/* ============== Question ============== */

export interface Question {
  id: string;
  number: string; // e.g. "1", "2" — questions do NOT have sub-parts
  paperId: string; // e.g. "bio-2024-June-V2"
  questionType?: string;
  intro: RichText;
  data?: DataRow[]; // ordered list of rows of blocks (image/table/chart)
  text: RichText; // the actual question text
  options?: MCQOptions; // MCQ options (5 styles)

  topics: string[]; // topic keys
  lessons: string[]; // lesson keys
  skills: string[]; // skill sub keys
  tags: string[];
  traps: string[];
  difficulty: Difficulty;
  priority: Priority;
  targetGrade: TargetGrade;
  repetition: number; // how many times this Q-style appeared historically
}

/* ============== Helpers (succinct constructors) ============== */

export const t = (text: string, ...marks: InlineMark[]): TextRun => ({ type: "text", text, marks });
export const tex = (tex: string, display = false): LatexRun => ({ type: "latex", tex, display });
export const br: BreakRun = { type: "br" };
export const p = (...runs: Run[]): RichBlock => ({ kind: "p", runs });
export const h2 = (...runs: Run[]): RichBlock => ({ kind: "h2", runs });
export const h3 = (...runs: Run[]): RichBlock => ({ kind: "h3", runs });
export const center = (block: RichBlock): RichBlock => ({ ...block, align: "center" });
export const ul = (...items: Run[][]): ListBlock => ({ kind: "ul", items });
export const ol = (...items: Run[][]): ListBlock => ({ kind: "ol", items });

/* ============== MCQ Options ============== */

export type OptionLetter = "A" | "B" | "C" | "D";
export const OPTION_LETTERS: OptionLetter[] = ["A", "B", "C", "D"];

export type OptionLayout = "vertical" | "horizontal" | "grid";

export interface BaseOption {
  letter: OptionLetter;
  tags?: string[]; // e.g. "trap-option", "easy-to-eliminate", custom
}

export interface TextOption extends BaseOption {
  content: RichText;
}
export interface ImageOption extends BaseOption {
  src: string;
  alt: string;
  imageType?: ImageType; // tweak as Diagram if needed
  size?: ImageSize; // sm | md | lg, default md
  caption?: RichText;
}
export interface ChartOption extends BaseOption {
  chart: ChartBlock;
}

/** Text MCQ */
export interface TextOptionsMCQ {
  type: "text-options";
  layout?: OptionLayout; // default vertical
  options: TextOption[]; // length 4
}

/** Image MCQ */
export interface ImageOptionsMCQ {
  type: "image-options";
  layout?: OptionLayout;
  options: ImageOption[];
}

/** Graph MCQ */
export interface GraphOptionsMCQ {
  type: "graph-options";
  layout?: OptionLayout;
  options: ChartOption[];
}

/** Table MCQ — options on rows / columns / cells */
export interface TableRowOptionsMCQ {
  type: "table-options-rows";
  table: TableBlock;
  /** Map letter -> rowIndex (0-based, in `table.rows`) */
  optionRows: { letter: OptionLetter; rowIndex: number; tags?: string[] }[];
}
export interface TableColOptionsMCQ {
  type: "table-options-cols";
  table: TableBlock;
  /** Map letter -> colIndex (0-based) */
  optionCols: { letter: OptionLetter; colIndex: number; tags?: string[] }[];
}
export interface TableCellOptionsMCQ {
  type: "table-options-cells";
  table: TableBlock;
  /** Each option points at a cell coord {row, col} */
  optionCells: { letter: OptionLetter; row: number; col: number; tags?: string[] }[];
}

/** Image-positioned MCQ */
export interface ImagePositionedMCQ {
  type: "image-positioned";
  src: string;
  alt: string;
  imageType?: ImageType;
  size?: ImageSize; // sm | md | lg, default md
  /** x and y are 0..100 percentages relative to image */
  options: { letter: OptionLetter; x: number; y: number; label?: RichText; tags?: string[] }[];
}

export type MCQOptions =
  | TextOptionsMCQ
  | ImageOptionsMCQ
  | GraphOptionsMCQ
  | TableRowOptionsMCQ
  | TableColOptionsMCQ
  | TableCellOptionsMCQ
  | ImagePositionedMCQ;

/* ============== Sample Questions ============== */

import photo from "@/assets/image-1.jpg";

const PHOTOSYNTHESIS_CHART: ChartBlock = {
  type: "chart",
  chart: "line",
  title: [center(p(t("Rate of photosynthesis vs temperature", "bold")))],
  xLabel: "temperature / °C",
  yLabel: "rate of photosynthesis",
  series: [
    {
      name: "Rate",
      lineStyle: "smooth",
      data: [
        { x: 0, y: 0 },
        { x: 5, y: 3 },
        { x: 10, y: 12 },
        { x: 15, y: 28 },
        { x: 20, y: 38 },
        { x: 25, y: 30 },
        { x: 30, y: 18 },
        { x: 35, y: 7 },
        { x: 40, y: 1 },
      ],
    },
  ],
  showLegend: false,
};

const SAMPLE_TABLE: TableBlock = {
  type: "table",
  caption: [center(p(t("Comparison of transport processes", "italic")))],
  columnGroups: [
    { label: [p(t(""))], span: 1 },
    { label: [center(p(t("Passive", "bold")))], span: 2 },
    { label: [center(p(t("Active", "bold")))], span: 1 },
  ],
  rows: [
    [
      { content: [p(t("Property"))], isHeader: true },
      { content: [p(t("Diffusion"))], isHeader: true },
      { content: [p(t("Osmosis"))], isHeader: true },
      { content: [p(t("Active Transport"))], isHeader: true },
    ],
    [
      { content: [p(t("Energy required"))] },
      { content: [p(t("✗"))], align: "center" },
      { content: [p(t("✗"))], align: "center" },
      { content: [p(t("✓"))], align: "center" },
    ],
    [
      { content: [p(t("Against gradient"))] },
      { content: [p(t("✗"))], align: "center" },
      { content: [p(t("✗"))], align: "center" },
      { content: [p(t("✓"))], align: "center" },
    ],
    [
      { content: [p(t("Carrier proteins"))] },
      { content: [p(t("✗"))], align: "center" },
      { content: [p(t("sometimes", "italic"))], align: "center" },
      { content: [p(t("✓"))], align: "center" },
    ],
  ],
  key: [
    { symbol: "✓", meaning: [p(t("required / present"))] },
    { symbol: "✗", meaning: [p(t("not required / absent"))] },
  ],
};

const RATES_BAR_CHART: ChartBlock = {
  type: "chart",
  chart: "bar",
  title: [center(p(t("Reaction rate by catalyst", "bold")))],
  xLabel: "catalyst",
  yLabel: "rate (cm³/s)",
  series: [
    {
      name: "Rate",
      data: [
        { x: "None", y: 1.2 },
        { x: "Pt", y: 4.8 },
        { x: "Ni", y: 3.1 },
        { x: "Fe", y: 2.4 },
      ],
    },
  ],
  showLegend: false,
};

const PIE_CHART: ChartBlock = {
  type: "chart",
  chart: "pie",
  title: [center(p(t("Composition of dry air", "bold")))],
  series: [
    {
      name: "Air",
      data: [
        { x: "N₂", y: 78 },
        { x: "O₂", y: 21 },
        { x: "Ar", y: 0.9 },
        { x: "CO₂", y: 0.1 },
      ],
    },
  ],
  showLegend: true,
};

const TWO_SERIES_LINE: ChartBlock = {
  type: "chart",
  chart: "line",
  title: [center(p(t("Velocity vs time", "bold")))],
  xLabel: "time / s",
  yLabel: "velocity / m s⁻¹",
  series: [
    {
      name: "Object A",
      lineStyle: "best-fit",
      data: [
        { x: 0, y: 1 },
        { x: 1, y: 3 },
        { x: 2, y: 4.5 },
        { x: 3, y: 7 },
        { x: 4, y: 9 },
        { x: 5, y: 11 },
      ],
    },
    {
      name: "Object B",
      lineStyle: "straight",
      data: [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
        { x: 4, y: 8 },
        { x: 5, y: 10 },
      ],
    },
  ],
  showLegend: true,
};

export const QUESTIONS: Question[] = [
  // ───────────────────── Q1: bio-2024-June-V2 ─────────────────────
  {
    id: "q-bio-2024-June-V2-1",
    number: "1",
    paperId: "bio-2024-June-V2",
    questionType: "",
    intro: [
      h2(t("Photosynthesis & Temperature")),
      p(
        t("Plants carry out "),
        t("photosynthesis", "bold"),
        t(" using "),
        t("chlorophyll", "italic"),
        t(" inside chloroplasts. The overall reaction can be written as:"),
      ),
      center(
        p(
          tex(
            "6\\,CO_2(g) + 6\\,H_2O(l) \\xrightarrow{\\text{light}} C_6H_{12}O_6(aq) + 6\\,O_2(g)",
            true,
          ),
        ),
      ),
      p(
        t("The "),
        t("rate", "underline"),
        t(" of photosynthesis depends on temperature. At low temperatures, "),
        tex("\\alpha"),
        t("-amylase and other enzymes are slow; above ~"),
        tex("40^{\\circ}C"),
        t(" they begin to "),
        t("denature", "strike"),
        t("denature", "bold"),
        t(". Use the chart below — note that "),
        t("highlighted", "highlight"),
        t(" values exceed the optimum (this hint is "),
        t("muted on purpose", "muted"),
        t(")."),
        br,
        t("Useful constants: "),
        tex("k = 1.38 \\times 10^{-23}\\,\\mathrm{J\\,K^{-1}}"),
        t(", "),
        tex("\\Delta G = \\Delta H - T\\Delta S"),
        t("."),
      ),
    ],
    data: [
      { blocks: [PHOTOSYNTHESIS_CHART] },
      {
        blocks: [
          {
            type: "image",
            src: photo,
            alt: "Plant cell diagram",
            imageType: "Diagram",
            size: "md",
            title: [center(p(t("Fig 1.1", "bold"), t(" — chloroplast")))],
            titleCentered: true,
            caption: [center(p(t("A simplified diagram of a chloroplast.", "italic")))],
          },
        ],
      },
    ],
    text: [
      p(
        t(
          "(a) State the optimum temperature shown in the graph and explain, with reference to enzyme activity, why the rate decreases above this value. ",
        ),
        t("[3]", "muted"),
      ),
    ],
    topics: ["bio-6-plant-nutrition", "bio-2-organisation-of-the-organism"],
    lessons: ["bio-6-photosynthesis", "bio-2-cell-structure"],
    skills: ["interpretation", "extrapolation"],
    tags: ["important", "data-heavy", "classic"],
    traps: ["axis-mislabel", "unit-mixup"],
    difficulty: "medium",
    priority: "high",
    targetGrade: "A",
    repetition: 7,
  },

  // ───────────────────── Q2: bio-2024-June-V2 ─────────────────────
  {
    id: "q-bio-2024-June-V2-2",
    number: "2",
    paperId: "bio-2024-June-V2",
    intro: [
      h3(t("Plant Transport — A Practical")),
      p(
        t("A student stripped the "),
        t("epidermis and outer transport tissue", "italic"),
        t(" from a young stem and observed it over time."),
      ),
      p(t("They recorded the following observations:")),
      ol(
        [t("The stem appeared firm at "), tex("t = 0"), t(".")],
        [t("After 15 minutes, the inner tissue began to "), t("swell visibly", "bold"), t(".")],
        [t("By 30 minutes, "), t("water droplets", "highlight"), t(" appeared on the surface.")],
      ),
      p(t("Possible explanations include:")),
      ul(
        [t("Osmotic uptake driven by "), tex("\\Delta\\Psi_w"), t(" gradients.")],
        [t("Capillary action in xylem vessels.")],
        [t("Active transport of "), tex("K^+"), t(" into companion cells.")],
      ),
    ],
    data: [
      {
        // Two images side by side
        blocks: [
          {
            type: "image",
            src: photo,
            alt: "Stem before",
            imageType: "Diagram",
            size: "sm",
            title: [p(t("Before", "bold"))],
            caption: [center(p(t("t = 0 minutes")))],
          },
          {
            type: "image",
            src: photo,
            alt: "Stem after",
            imageType: "Diagram",
            size: "sm",
            title: [p(t("After", "bold"))],
            caption: [center(p(t("t = 30 minutes — note the "), t("swelling", "highlight")))],
          },
        ],
      },
      { blocks: [SAMPLE_TABLE] },
    ],
    text: [
      p(
        t("(b) Suggest, using your knowledge of phloem and water potential "),
        tex("(\\Psi_w)"),
        t(", why the swelling occurs. "),
        t("[4]", "muted"),
      ),
    ],
    topics: ["bio-8-transport-in-plants"],
    lessons: ["bio-8-xylem-and-phloem"],
    skills: ["interpretation", "design"],
    tags: ["diagram-heavy", "tricky"],
    traps: ["double-negative"],
    difficulty: "hard",
    priority: "high",
    targetGrade: "A*",
    repetition: 3,
  },

  // ───────────────────── Q3: chem-2024-June-V2 ─────────────────────
  {
    id: "q-chem-2024-June-V2-1",
    number: "1",
    paperId: "chem-2024-June-V2",
    intro: [
      h2(t("Reversible Reactions & Catalysts")),
      p(
        t("Consider the reversible reaction "),
        tex("N_2(g) + 3H_2(g) \\rightleftharpoons 2NH_3(g)"),
        t(". The forward reaction is "),
        t("exothermic", "bold"),
        t(" with "),
        tex("\\Delta H = -92\\,\\mathrm{kJ\\,mol^{-1}}"),
        t("."),
        br,
        t("In acidic conditions, "),
        tex("H_3O^+"),
        t(" forms; in basic conditions, "),
        tex("OH^-"),
        t(" dominates. The expression for "),
        tex("K_c = \\dfrac{[NH_3]^2}{[N_2][H_2]^3}"),
        t(" can be written in standard form as "),
        tex("6.0 \\times 10^{2}\\,\\mathrm{mol^{-2}\\,dm^{6}}"),
        t("."),
      ),
    ],
    data: [
      { blocks: [RATES_BAR_CHART, PIE_CHART] }, // INLINE: bar + pie
      {
        blocks: [
          {
            type: "image",
            src: photo,
            alt: "Industrial reactor",
            imageType: "Photograph",
            size: "lg",
            title: [center(p(t("A Haber process reactor", "bold", "italic")))],
            titleCentered: true,
            caption: [center(p(t("Operating at ~"), tex("450^{\\circ}C"), t(" and 200 atm.")))],
          },
        ],
      },
    ],
    text: [
      p(
        t(
          "(a) Predict, using Le Chatelier's principle, the effect of increasing temperature on the position of equilibrium. ",
        ),
        t("[2]", "muted"),
      ),
    ],
    topics: ["chem-6-chemical-reactions"],
    lessons: ["chem-6-equilibrium", "chem-6-the-haber-process"],
    skills: ["calculation", "interpretation"],
    tags: ["exam-favourite", "spicy"],
    traps: ["sig-figs", "cause-vs-correlation"],
    difficulty: "medium",
    priority: "critical",
    targetGrade: "A",
    repetition: 12,
  },

  // ───────────────────── Q4: chem-2024-June-V2 ─────────────────────
  {
    id: "q-chem-2024-June-V2-2",
    number: "2",
    paperId: "chem-2024-June-V2",
    intro: [
      p(
        t("An ester is prepared from ethanol and ethanoic acid. The structural equation is "),
        tex("CH_3COOH + C_2H_5OH \\rightleftharpoons CH_3COOC_2H_5 + H_2O"),
        t(". The reaction is catalysed by concentrated "),
        tex("H_2SO_4"),
        t("."),
      ),
    ],
    data: [
      {
        blocks: [
          {
            type: "table",
            caption: [center(p(t("Yields under different conditions", "italic")))],
            rowGroups: [
              { startRow: 1, label: [p(t("Acid catalysts", "bold"))] },
              { startRow: 4, label: [p(t("Base catalysts", "bold"))] },
            ],
            rows: [
              [
                { content: [p(t("Catalyst"))], isHeader: true },
                { content: [p(t("Temp / °C"))], isHeader: true },
                { content: [p(t("Yield / %"))], isHeader: true },
              ],
              [
                { content: [p(tex("H_2SO_4"))] },
                { content: [p(t("60"))], align: "center" },
                { content: [p(t("65"))], align: "center" },
              ],
              [
                { content: [p(tex("HCl"))] },
                { content: [p(t("60"))], align: "center" },
                { content: [p(t("48"))], align: "center" },
              ],
              [
                { content: [p(tex("HNO_3"))] },
                { content: [p(t("60"))], align: "center" },
                { content: [p(t("52"))], align: "center" },
              ],
              [
                { content: [p(tex("NaOH"))] },
                { content: [p(t("60"))], align: "center" },
                { content: [p(t("12"))], align: "center" },
              ],
              [
                { content: [p(tex("KOH"))] },
                { content: [p(t("60"))], align: "center" },
                { content: [p(t("9"))], align: "center" },
              ],
            ],
          },
        ],
      },
    ],
    text: [
      p(
        t("(c) Explain why "),
        tex("H_2SO_4"),
        t(" gives a higher yield than "),
        tex("NaOH"),
        t(". "),
        t("[3]", "muted"),
      ),
    ],
    topics: ["chem-11-organic-chemistry"],
    lessons: ["chem-11-ethanoic-acid-and-esterification-reactions", "chem-11-alcohols"],
    skills: ["interpretation", "definitions"],
    tags: ["wordy", "long"],
    traps: ["double-negative"],
    difficulty: "hard",
    priority: "high",
    targetGrade: "A*",
    repetition: 5,
  },

  // ───────────────────── Q5: phys-2024-June-V2 ─────────────────────
  {
    id: "q-phys-2024-June-V2-1",
    number: "1",
    paperId: "phys-2024-June-V2",
    intro: [
      h2(t("Kinematics — Two Objects")),
      p(
        t(
          "Two objects, A and B, move in a straight line. Their motion is recorded in the graph below. Use ",
        ),
        tex("v = u + at"),
        t(" and "),
        tex("s = ut + \\tfrac{1}{2}at^{2}"),
        t(" where appropriate."),
      ),
    ],
    data: [{ blocks: [TWO_SERIES_LINE] }],
    text: [
      p(
        t("(a) Determine the acceleration of Object B between "),
        tex("t = 0\\,\\mathrm{s}"),
        t(" and "),
        tex("t = 5\\,\\mathrm{s}"),
        t(". State your answer in standard form to 3 s.f. "),
        t("[3]", "muted"),
      ),
    ],
    topics: ["phys-1-motion-forces-and-energy"],
    lessons: ["phys-1-speed-time-graphs", "phys-1-acceleration"],
    skills: ["calculation"],
    tags: ["important", "short"],
    traps: ["sig-figs", "off-by-one"],
    difficulty: "easy",
    priority: "medium",
    targetGrade: "B",
    repetition: 9,
  },

  // ───────────────────── Q6: phys-2024-June-V2 ─────────────────────
  {
    id: "q-phys-2024-June-V2-2",
    number: "2",
    paperId: "phys-2024-June-V2",
    intro: [
      p(
        t("A wave passes through a single slit producing a "),
        t("diffraction pattern", "bold"),
        t(". The intensity envelope and the central maximum can be modelled with "),
        tex(
          "I(\\theta) = I_0 \\left(\\dfrac{\\sin\\beta}{\\beta}\\right)^2,\\ \\beta = \\dfrac{\\pi a \\sin\\theta}{\\lambda}",
        ),
        t(". Wavelength: "),
        tex("\\lambda = 6.30 \\times 10^{-7}\\,\\mathrm{m}"),
        t("."),
      ),
    ],
    data: [
      {
        blocks: [
          {
            type: "image",
            src: photo,
            alt: "Diffraction setup",
            imageType: "Diagram",
            size: "md",
            caption: [center(p(t("Single-slit diffraction setup.", "italic")))],
          },
          {
            type: "image",
            src: photo,
            alt: "Lab photo",
            imageType: "Photograph",
            size: "md",
            title: [p(t("Lab photo", "bold"))],
          },
        ],
      },
    ],
    text: [
      p(
        t("(b) Sketch how the intensity pattern would change if the slit width "),
        tex("a"),
        t(" were halved. "),
        t("[2]", "muted"),
      ),
    ],
    topics: ["phys-3-waves"],
    lessons: ["phys-3-wave-behaviour", "phys-3-the-wave-equation"],
    skills: ["diagrams", "interpretation"],
    tags: ["diagram-heavy", "tricky"],
    traps: ["axis-mislabel"],
    difficulty: "devilish",
    priority: "high",
    targetGrade: "A*",
    repetition: 2,
  },

  /* ═══════════════════════════════════════════════════════════
     MCQ DEMO QUESTIONS — all 5 option styles
     ═══════════════════════════════════════════════════════════ */

  // ───── MCQ 1: text-options VERTICAL — bio
  {
    id: "q-bio-2024-June-V2-mcq1",
    number: "27",
    paperId: "bio-2024-June-V2",
    questionType: "text-options",
    intro: [
      h3(t("Reproduction Strategies")),
      p(
        t(
          "Asexual reproduction produces genetically identical offspring. Consider these advantages and disadvantages:",
        ),
      ),
      ul(
        [t("No mate required — colonisation is fast.")],
        [t("All offspring share the parent's adaptations.")],
        [
          t("Lack of variation makes the population vulnerable to "),
          t("environmental change", "bold"),
          t("."),
        ],
      ),
    ],
    text: [p(t("What is an advantage of asexual reproduction in a wild population?"))],
    options: {
      type: "text-options",
      layout: "vertical",
      options: [
        {
          letter: "A",
          content: [
            p(t("The population has reduced ability to respond to changes in the environment.")),
          ],
          tags: ["trap-option"],
        },
        {
          letter: "B",
          content: [p(t("The population can increase rapidly when conditions are suitable."))],
        },
        {
          letter: "C",
          content: [p(t("The population shows a lot of variation."))],
          tags: ["easy-to-eliminate"],
        },
        {
          letter: "D",
          content: [p(t("The whole population may be killed by a disease pathogen."))],
          tags: ["easy-to-eliminate", "negative-framing"],
        },
      ],
    },
    topics: ["bio-16-reproduction"],
    lessons: ["bio-16-asexual-reproduction"],
    skills: ["interpretation"],
    tags: ["mcq", "classic"],
    traps: ["double-negative"],
    difficulty: "easy",
    priority: "medium",
    targetGrade: "B",
    repetition: 6,
  },

  // ───── MCQ 2: text-options HORIZONTAL — bio
  {
    id: "q-bio-2024-June-V2-mcq2",
    number: "28",
    paperId: "bio-2024-June-V2",
    questionType: "text-options",
    intro: [
      p(t("Two parents have blood groups "), t("AB"), t(" and "), t("OO"), t(" respectively.")),
    ],
    text: [
      p(
        t(
          "What is the chance that the child will have the same blood group as one of its parents?",
        ),
      ),
    ],
    options: {
      type: "text-options",
      layout: "horizontal",
      options: [
        { letter: "A", content: [p(t("zero"))], tags: ["easy-to-eliminate"] },
        { letter: "B", content: [p(t("1 in 4"))], tags: ["trap-option"] },
        { letter: "C", content: [p(t("1 in 2"))] },
        { letter: "D", content: [p(t("3 in 4"))] },
      ],
    },
    topics: ["bio-17-inheritance"],
    lessons: ["bio-17-codominance-and-sex-linked-characteristics"],
    skills: ["calculation"],
    tags: ["mcq", "short"],
    traps: ["punnet-square"],
    difficulty: "medium",
    priority: "high",
    targetGrade: "A",
    repetition: 4,
  },

  // ───── MCQ 3: table-options-rows — bio
  {
    id: "q-bio-2024-June-V2-mcq3",
    number: "29",
    paperId: "bio-2024-June-V2",
    questionType: "table-options-rows",
    intro: [
      p(
        t("The diagram shows a section through a kidney with structures labelled "),
        t("P"),
        t(", "),
        t("Q"),
        t(" and "),
        t("R"),
        t("."),
      ),
    ],
    text: [p(t("What are the correct names for structures P, Q and R?"))],
    options: {
      type: "table-options-rows",
      table: {
        type: "table",
        rows: [
          [
            { content: [p(t(""))], isHeader: true }, // letter column
            { content: [p(t("P"))], isHeader: true, align: "center" },
            { content: [p(t("Q"))], isHeader: true, align: "center" },
            { content: [p(t("R"))], isHeader: true, align: "center" },
          ],
          [
            { content: [p(t("A"))], isHeader: true, align: "center" },
            { content: [p(t("urethra"))], align: "center" },
            { content: [p(t("cortex"))], align: "center" },
            { content: [p(t("medulla"))], align: "center" },
          ],
          [
            { content: [p(t("B"))], isHeader: true, align: "center" },
            { content: [p(t("ureter"))], align: "center" },
            { content: [p(t("medulla"))], align: "center" },
            { content: [p(t("cortex"))], align: "center" },
          ],
          [
            { content: [p(t("C"))], isHeader: true, align: "center" },
            { content: [p(t("urethra"))], align: "center" },
            { content: [p(t("medulla"))], align: "center" },
            { content: [p(t("cortex"))], align: "center" },
          ],
          [
            { content: [p(t("D"))], isHeader: true, align: "center" },
            { content: [p(t("ureter"))], align: "center" },
            { content: [p(t("cortex"))], align: "center" },
            { content: [p(t("medulla"))], align: "center" },
          ],
        ],
      },
      optionRows: [
        { letter: "A", rowIndex: 1, tags: ["trap-option"] },
        { letter: "B", rowIndex: 2 },
        { letter: "C", rowIndex: 3 },
        { letter: "D", rowIndex: 4, tags: ["easy-to-eliminate"] },
      ],
    },
    topics: ["bio-13-excretion-in-humans"],
    lessons: ["bio-13-the-kidney"],
    skills: ["recall", "interpretation"],
    tags: ["mcq", "diagram-heavy"],
    traps: ["label-confusion"],
    difficulty: "medium",
    priority: "high",
    targetGrade: "A",
    repetition: 5,
  },

  // ───── MCQ 4: table-options-cells — chem (cells with sub-rows/columns)
  {
    id: "q-chem-2024-June-V2-mcq1",
    number: "15",
    paperId: "chem-2024-June-V2",
    questionType: "table-options-cells",
    intro: [
      p(
        t(
          "Four samples are tested for solubility and conductivity. Each cell of the table represents one combination — pick the cell that matches a ",
        ),
        t("soluble ionic compound"),
        t("."),
      ),
    ],
    text: [p(t("Which cell shows the correct combination?"))],
    options: {
      type: "table-options-cells",
      table: {
        type: "table",
        columnGroups: [
          { label: [center(p(t("")))], span: 1 },
          { label: [center(p(t("Soluble")))], span: 2 },
          { label: [center(p(t("Insoluble")))], span: 2 },
        ],
        rows: [
          [
            { content: [p(t(""))], isHeader: true },
            { content: [p(t("Conducts"))], isHeader: true, align: "center" },
            { content: [p(t("No conduct"))], isHeader: true, align: "center" },
            { content: [p(t("Conducts"))], isHeader: true, align: "center" },
            { content: [p(t("No conduct"))], isHeader: true, align: "center" },
          ],
          [
            { content: [p(t("Ionic"))], isHeader: true },
            { content: [p(t("A"))], align: "center" },
            { content: [p(t("—"))], align: "center" },
            { content: [p(t("B"))], align: "center" },
            { content: [p(t("—"))], align: "center" },
          ],
          [
            { content: [p(t("Covalent"))], isHeader: true },
            { content: [p(t("—"))], align: "center" },
            { content: [p(t("C"))], align: "center" },
            { content: [p(t("—"))], align: "center" },
            { content: [p(t("D"))], align: "center" },
          ],
        ],
      },
      optionCells: [
        { letter: "A", row: 1, col: 1 },
        { letter: "B", row: 1, col: 3, tags: ["trap-option"] },
        { letter: "C", row: 2, col: 2, tags: ["easy-to-eliminate"] },
        { letter: "D", row: 2, col: 4, tags: ["easy-to-eliminate"] },
      ],
    },
    topics: ["chem-2-atoms-elements-and-compounds"],
    lessons: ["chem-2-properties-of-ionic-compounds"],
    skills: ["interpretation"],
    tags: ["mcq", "tricky"],
    traps: ["mixed-properties"],
    difficulty: "medium",
    priority: "high",
    targetGrade: "A",
    repetition: 3,
  },

  // ───── MCQ 5: image-options 2x2 GRID — bio
  {
    id: "q-bio-2024-June-V2-mcq4",
    number: "30",
    paperId: "bio-2024-June-V2",
    questionType: "image-options",
    intro: [
      p(
        t("Chloride ions ("),
        tex("Cl^-"),
        t(") and water ("),
        tex("H_2O"),
        t(") are exchanged between the gut and the small intestine epithelial cells."),
      ),
    ],
    text: [p(t("Which diagram shows the correct movement of chloride ions and water?"))],
    options: {
      type: "image-options",
      layout: "grid",
      options: [
        {
          letter: "A",
          src: photo,
          alt: "Both moving into cell",
          imageType: "Diagram",
          caption: [p(t("Both into cell"))],
        },
        {
          letter: "B",
          src: photo,
          alt: "Both moving out",
          imageType: "Diagram",
          caption: [p(t("Both out to gut"))],
          tags: ["trap-option"],
        },
        {
          letter: "C",
          src: photo,
          alt: "Cl out, water in",
          imageType: "Diagram",
          caption: [p(tex("Cl^-"), t(" out, "), tex("H_2O"), t(" in"))],
          tags: ["easy-to-eliminate"],
        },
        {
          letter: "D",
          src: photo,
          alt: "Cl in, water out",
          imageType: "Diagram",
          caption: [p(tex("Cl^-"), t(" in, "), tex("H_2O"), t(" out"))],
        },
      ],
    },
    topics: ["bio-3-movement-into-and-out-of-cells", "bio-7-human-nutrition"],
    lessons: ["bio-3-osmosis-in-animals-and-plants", "bio-7-absorption"],
    skills: ["interpretation", "diagrams"],
    tags: ["mcq", "diagram-heavy"],
    traps: ["arrow-direction"],
    difficulty: "hard",
    priority: "high",
    targetGrade: "A*",
    repetition: 4,
  },

  // ───── MCQ 6: image-positioned — bio
  {
    id: "q-bio-2024-June-V2-mcq5",
    number: "31",
    paperId: "bio-2024-June-V2",
    questionType: "image-positioned",
    intro: [p(t("The diagram shows the human digestive system with four structures labelled."))],
    text: [p(t("Which structure is the duodenum?"))],
    options: {
      type: "image-positioned",
      src: photo,
      alt: "Digestive system diagram",
      imageType: "Diagram",
      options: [
        { letter: "A", x: 62, y: 42, label: [p(t("stomach"))] },
        { letter: "B", x: 72, y: 75, label: [p(t("ileum"))], tags: ["trap-option"] },
        { letter: "C", x: 38, y: 55, label: [p(t("duodenum"))] },
        { letter: "D", x: 35, y: 25, label: [p(t("oesophagus"))], tags: ["easy-to-eliminate"] },
      ],
    },
    topics: ["bio-7-human-nutrition"],
    lessons: ["bio-7-digestive-system"],
    skills: ["recall", "interpretation"],
    tags: ["mcq", "diagram-heavy"],
    traps: ["adjacent-structures"],
    difficulty: "medium",
    priority: "high",
    targetGrade: "A",
    repetition: 7,
  },

  // ───── MCQ 7: graph-options 2x2 — bio enzyme/temperature
  {
    id: "q-bio-2024-June-V2-mcq6",
    number: "32",
    paperId: "bio-2024-June-V2",
    questionType: "graph-options",
    intro: [
      p(
        t("An enzyme catalyses a reaction in a mammal. Its optimum temperature is around "),
        tex("37^{\\circ}C"),
        t("."),
      ),
    ],
    text: [p(t("Which graph shows the effect of temperature on the activity of this enzyme?"))],
    options: {
      type: "graph-options",
      layout: "grid",
      options: [
        {
          letter: "A",
          tags: ["easy-to-eliminate"],
          chart: {
            type: "chart",
            chart: "line",
            xLabel: "temperature / °C",
            yLabel: "enzyme activity",
            series: [
              {
                name: "A",
                lineStyle: "smooth",
                data: [
                  { x: 0, y: 9 },
                  { x: 10, y: 6 },
                  { x: 20, y: 2 },
                  { x: 30, y: 1 },
                  { x: 40, y: 3 },
                  { x: 50, y: 7 },
                  { x: 60, y: 10 },
                ],
              },
            ],
          },
        },
        {
          letter: "B",
          tags: ["trap-option"],
          chart: {
            type: "chart",
            chart: "line",
            xLabel: "temperature / °C",
            yLabel: "enzyme activity",
            series: [
              {
                name: "B",
                lineStyle: "straight",
                data: [
                  { x: 0, y: 0 },
                  { x: 10, y: 2 },
                  { x: 20, y: 4 },
                  { x: 30, y: 6 },
                  { x: 40, y: 8 },
                  { x: 50, y: 10 },
                  { x: 60, y: 12 },
                ],
              },
            ],
          },
        },
        {
          letter: "C",
          chart: {
            type: "chart",
            chart: "line",
            xLabel: "temperature / °C",
            yLabel: "enzyme activity",
            series: [
              {
                name: "C",
                lineStyle: "best-fit",
                data: [
                  { x: 0, y: 0 },
                  { x: 10, y: 3 },
                  { x: 20, y: 6 },
                  { x: 30, y: 8 },
                  { x: 40, y: 8 },
                  { x: 50, y: 8 },
                  { x: 60, y: 8 },
                ],
              },
            ],
          },
        },
        {
          letter: "D",
          chart: {
            type: "chart",
            chart: "line",
            xLabel: "temperature / °C",
            yLabel: "enzyme activity",
            series: [
              {
                name: "D",
                lineStyle: "smooth",
                data: [
                  { x: 0, y: 0 },
                  { x: 10, y: 3 },
                  { x: 20, y: 6 },
                  { x: 30, y: 9 },
                  { x: 37, y: 10 },
                  { x: 40, y: 8 },
                  { x: 45, y: 1 },
                  { x: 50, y: 0 },
                ],
              },
            ],
          },
        },
      ],
    },
    topics: ["bio-5-enzymes"],
    lessons: ["bio-5-enzymes-and-temperature"],
    skills: ["interpretation"],
    tags: ["mcq", "graph"],
    traps: ["linear-vs-optimum"],
    difficulty: "easy",
    priority: "critical",
    targetGrade: "B",
    repetition: 11,
  },

  // ───── MCQ 8: table-options-cols — phys
  {
    id: "q-phys-2024-June-V2-mcq1",
    number: "10",
    paperId: "phys-2024-June-V2",
    questionType: "table-options-cols",
    intro: [
      p(
        t(
          "Four columns of data show measured values for resistance, current, voltage and power for a circuit element. Pick the column where ALL values are consistent with ",
        ),
        tex("V = IR"),
        t(" and "),
        tex("P = VI"),
        t("."),
      ),
    ],
    text: [p(t("Which column shows a self-consistent set of measurements?", "bold"))],
    options: {
      type: "table-options-cols",
      table: {
        type: "table",
        rows: [
          [
            { content: [p(t(""))], isHeader: true },
            { content: [p(t("A"))], isHeader: true, align: "center" },
            { content: [p(t("B"))], isHeader: true, align: "center" },
            { content: [p(t("C"))], isHeader: true, align: "center" },
            { content: [p(t("D"))], isHeader: true, align: "center" },
          ],
          [
            { content: [p(t("V / V"))], isHeader: true },
            { content: [p(t("12"))], align: "center" },
            { content: [p(t("6"))], align: "center" },
            { content: [p(t("9"))], align: "center" },
            { content: [p(t("4"))], align: "center" },
          ],
          [
            { content: [p(t("I / A"))], isHeader: true },
            { content: [p(t("2"))], align: "center" },
            { content: [p(t("3"))], align: "center" },
            { content: [p(t("1.5"))], align: "center" },
            { content: [p(t("2"))], align: "center" },
          ],
          [
            { content: [p(t("R / Ω"))], isHeader: true },
            { content: [p(t("6"))], align: "center" },
            { content: [p(t("2"))], align: "center" },
            { content: [p(t("4"))], align: "center" },
            { content: [p(t("2"))], align: "center" },
          ],
          [
            { content: [p(t("P / W"))], isHeader: true },
            { content: [p(t("24"))], align: "center" },
            { content: [p(t("18"))], align: "center" },
            { content: [p(t("12"))], align: "center" },
            { content: [p(t("10"))], align: "center" },
          ],
        ],
      },
      optionCols: [
        { letter: "A", colIndex: 1 },
        { letter: "B", colIndex: 2, tags: ["trap-option"] },
        { letter: "C", colIndex: 3, tags: ["trap-option"] },
        { letter: "D", colIndex: 4, tags: ["easy-to-eliminate"] },
      ],
    },
    topics: ["phys-4-electricity-and-magnetism"],
    lessons: ["phys-4-current-in-circuits", "phys-4-electrical-power"],
    skills: ["calculation"],
    tags: ["mcq", "data-heavy"],
    traps: ["off-by-power"],
    difficulty: "medium",
    priority: "high",
    targetGrade: "A",
    repetition: 6,
  },
];

export function getQuestionsByPaperId(paperId: string): Question[] {
  return QUESTIONS.filter((q) => q.paperId === paperId);
}
