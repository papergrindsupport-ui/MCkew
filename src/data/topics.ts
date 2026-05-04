// Centralized taxonomy: topics, lessons, skills, tags, traps, target grades.
// Imported by both questionData.ts and paperData.ts so they stay in sync.

import type { Subject } from "./paperData";

export type Difficulty = "silly" | "easy" | "medium" | "hard" | "devilish";
export type Priority = "low" | "medium" | "high" | "critical";
export type GradeThreshold = "highest" | "lowest" | "average" | "high" | "low";
export type TargetGrade = "A*" | "A" | "B" | "C" | "D" | "E";

export const DIFFICULTIES: Difficulty[] = ["silly", "easy", "medium", "hard", "devilish"];
export const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
export const GRADE_THRESHOLDS: GradeThreshold[] = ["highest", "lowest", "average", "high", "low"];
export const TARGET_GRADES: TargetGrade[] = ["A*", "A", "B", "C", "D", "E"];

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  silly: "bg-pink-500/15 text-pink-600 dark:text-pink-300 border-pink-400/40",
  easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/40",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-400/40",
  hard: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-400/40",
  devilish: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-400/40",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-400/40",
  medium: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-400/40",
  high: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-400/40",
  critical: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-400/40",
};

const RAW_TOPIC_CATALOG = {
  bio: [
    {
      label: "1. Characteristics & Classification of Living Organisms",
      lessons: [
        "Characteristics of Living Organisms",
        "Concept & Uses of Classification Systems",
        "Concept & Uses of Classification Systems Continued",
        "Features of Organisms",
        "Features of Organisms Continued",
      ],
    },
    {
      label: "2. Organisation of the Organism",
      lessons: [
        "Cell Structure",
        "Organisation of Cells",
        "Magnification Formula",
        "Converting Between Units",
      ],
    },
    {
      label: "3. Movement into & out of Cells",
      lessons: [
        "Diffusion in Biology",
        "Factors that Influence Diffusion",
        "Water",
        "Osmosis",
        "Osmosis Experiments",
        "Osmosis in Animals & Plants",
        "Active Transport",
        "Proteins & Active Transport",
      ],
    },
    {
      label: "4. Biological Molecules",
      lessons: ["Chemicals & Life", "Food Tests", "DNA Structure"],
    },
    {
      label: "5. Enzymes",
      lessons: [
        "Enzymes",
        "Enzyme Investigations",
        "Enzyme Action & Specificity",
        "Enzymes & Temperature",
        "Enzymes & pH",
      ],
    },
    {
      label: "6. Plant Nutrition",
      lessons: [
        "Photosynthesis",
        "Chlorophyll",
        "Use & Storage of Carbohydrates",
        "Minerals in Plants",
        "Investigating the Need for Chlorophyll, Light & Carbon Dioxide",
        "Investigating the Rate of Photosynthesis",
        "Investigating Gas Exchange",
        "Photosynthesis Chemical Equation",
        "Limiting Factors",
        "Leaf Structure",
        "Identifying Leaf Structures in a Dicotyledonous Plant",
      ],
    },
    {
      label: "7. Human Nutrition",
      lessons: [
        "Diet & Deficiencies",
        "Digestive System",
        "Physical Digestion",
        "Teeth & Digestion",
        "The Stomach",
        "Emulsification of Fats & Oils",
        "Chemical Digestion",
        "Enzymes in Digestion",
        "Hydrochloric Acid",
        "Digestion of Starch",
        "Digestion of Protein",
        "Bile",
        "Absorption",
        "Adaptations of the Small Intestine",
      ],
    },
    {
      label: "8. Transport in Plants",
      lessons: [
        "Xylem & Phloem",
        "Root Hair Cells",
        "Pathway Taken by Water",
        "Transpiration",
        "Investigating Temperature & Wind Speed",
        "Transpiration Stream",
        "Explaining the Effects of Temperature, Wind Speed & Humidity",
        "Translocation",
      ],
    },
    {
      label: "9. Transport in Animals",
      lessons: [
        "Circulatory System",
        "Circulatory System Continued",
        "The Mammalian Heart",
        "Monitoring Activity of the Heart",
        "Investigating Effect of Physical Activity on Heart Rate",
        "Coronary Heart Disease",
        "Identifying Structures in the Heart",
        "Functioning of the Heart",
        "Explaining the Effect of Physical Activity on Heart Rate",
        "Blood Vessels",
        "Circulation Around the Body",
        "Structure & Function of Blood Vessels",
        "Blood Vessels & the Liver",
        "Components of Blood",
        "Blood Clotting",
        "White Blood Cells",
        "Conversion of Fibrinogen",
      ],
    },
    {
      label: "10. Diseases & Immunity",
      lessons: [
        "Pathogens & Barriers",
        "Controlling the Spread of Disease",
        "Active Immunity",
        "Antigens & Antibodies",
        "Vaccination",
        "Preventing the Spread of Disease",
        "Passive Immunity & Breastfeeding",
        "Cholera",
      ],
    },
    {
      label: "11. Gas Exchange in Humans",
      lessons: [
        "Features of Gas Exchange Surfaces",
        "The Breathing System",
        "Investigating the Differences in Inspired & Expired Air",
        "Differences in Inspired & Expired Air",
        "Investigating the Effects of Physical Activity on Breathing",
        "Identifying Intercostal Muscles",
        "Function of Cartilage in the Trachea",
        "Volume & Pressure Changes in the Lungs",
        "Differences in Inspired & Expired Air",
        "Explaining the Link Between Physical Activity & Breathing",
        "Protecting the Breathing System",
      ],
    },
    {
      label: "12. Respiration",
      lessons: ["Respiration in Cells", "Aerobic Respiration", "Anaerobic Respiration"],
    },
    {
      label: "13. Excretion in Humans",
      lessons: ["Excretion in Humans", "The Kidney", "The Role of the Liver in Excretion"],
    },
    {
      label: "14. Coordination & Response",
      lessons: [
        "Mammalian Nervous System",
        "Types of Neurones",
        "The Reflex Arc",
        "The Synapse",
        "Sense Organs",
        "The Eye",
        "Hormones in Humans",
        "Homeostasis & Insulin",
        "Homeostasis",
        "Homeostasis: Temperature Control",
        "Tropisms",
      ],
    },
    {
      label: "15. Drugs",
      lessons: ["Drugs in Medicine"],
    },
    {
      label: "16. Reproduction",
      lessons: [
        "Asexual Reproduction",
        "Sexual Reproduction",
        "Sexual Reproduction in Plants",
        "Sexual Reproduction in Humans",
        "Sexual Hormones in Humans",
        "Sexually Transmitted Infections",
      ],
    },
    {
      label: "17. Inheritance",
      lessons: [
        "Chromosomes, Genes & Proteins",
        "The Inheritance of Sex",
        "Genes & Proteins",
        "Protein Synthesis",
        "Which Proteins are Synthesised?",
        "Mitosis",
        "Meiosis",
        "Monohybrid Inheritance",
        "Codominance & Sex-Linked Characteristics",
      ],
    },
    {
      label: "18. Variation & Selection",
      lessons: [
        "Variation in Biology",
        "Adaptive Features",
        "Adaptive Features Continued",
        "Natural Selection",
        "Artificial Selection",
      ],
    },
    {
      label: "19. Organisms & Their Environment",
      lessons: [
        "Transfer of Energy",
        "Food Chains & Food Webs",
        "Pyramids of Number & Biomass",
        "Pyramids of Energy",
        "Nutrient Cycles",
        "Populations",
      ],
    },
    {
      label: "20. Human Influences on Ecosystems",
      lessons: [
        "Ensuring Food Supply",
        "The Importance of Biodiversity",
        "Water Pollution",
        "Other Pollution",
        "Sustainability",
        "Endangered Species",
        "Reasons for Conservation",
      ],
    },
    {
      label: "21. Biotechnology & Genetic Modification",
      lessons: ["Usefulness of Bacteria", "Biotechnology", "Genetic Modification"],
    },
  ],
  chem: [
    {
      label: "1. States of Matter",
      lessons: [
        "Kinetic Theory",
        "States of Matter",
        "Pressure & Temperature in Gases",
        "Diffusion",
      ],
    },
    {
      label: "2. Atoms, Elements & Compounds",
      lessons: [
        "Elements, Compounds & Mixtures",
        "Atomic Structure",
        "Electronic Configuration",
        "Isotopes",
        "Ions & Ionic Bonds",
        "Ionic Bonds & Lattice Structure",
        "Properties of Ionic Compounds",
        "Covalent Bonds",
        "Molecules & Compounds",
        "Properties of Simple Molecular Compounds",
        "Diamond & Graphite",
        "Silicon(IV) Oxide",
        "Metallic Bonding",
      ],
    },
    {
      label: "3. Stoichiometry",
      lessons: [
        "Formulae",
        "Empirical Formulae & Formulae of Ionic Compounds",
        "Writing Equations",
        "Ar & Mr",
        "The Mole",
        "Linking Moles, Mass & Mr",
        "Reacting Masses",
        "Calculating Concentration",
        "Titration Calculations",
        "Empirical & Molecular Formula",
        "Percentage Yield & Purity",
      ],
    },
    {
      label: "4. Electrochemistry",
      lessons: [
        "Electrolysis Principles",
        "Electrolysis of Molten Compounds",
        "Electrolysis of Aqueous Sodium Chloride & Dilute Sulfuric Acid",
        "Electrolysis of Aqueous Solutions",
        "Ionic Half Equations",
        "Electroplating",
        "Hydrogen Fuel Cells",
      ],
    },
    {
      label: "5. Chemical Energetics",
      lessons: [
        "Endothermic & Exothermic Reactions",
        "Enthalpy Change & Activation Energy",
        "Bond Breaking & Bond Forming",
      ],
    },
    {
      label: "6. Chemical Reactions",
      lessons: [
        "Physical & Chemical Changes",
        "Rates of Reaction Factors",
        "Collision Theory",
        "Explaining Rates Using Collision Theory",
        "Investigating The Rate of a Reaction",
        "Interpreting Data",
        "Reversible Reactions",
        "Equilibrium",
        "The Haber Process",
        "The Contact Process",
        "Oxidation & Reduction",
        "Redox & Electron Transfer",
      ],
    },
    {
      label: "7. Acids, Bases & Salts",
      lessons: [
        "Properties of Acids & Bases",
        "The Ions in Acids & Alkalis",
        "Proton Transfer, Strong & Weak Acids",
        "Classifying Oxides",
        "Preparing Soluble Salts",
        "Preparing Insoluble Salts",
        "Solubility Rules",
        "Hydrated & Anhydrous Salts",
      ],
    },
    {
      label: "8. The Periodic Table",
      lessons: [
        "The Periodic Table",
        "Periodic Trends",
        "Group I Properties",
        "Group VII Properties",
        "Group VII Displacement Reactions",
        "Transition Elements",
        "Noble Gases",
      ],
    },
    {
      label: "9. Metals",
      lessons: [
        "Properties of Metals",
        "Uses of Metals",
        "Alloys",
        "Reactivity Series",
        "Explaining Reactivity",
        "Rusting of Iron",
        "Galvanising & Sacrificial Protection",
        "Extraction of Metals",
        "Extraction of Iron from Hematite",
        "Extraction of Aluminium from Bauxite",
      ],
    },
    {
      label: "10. Chemistry of the Environment",
      lessons: [
        "Water: Chemical Tests",
        "Substances in Water from Natural Sources",
        "Water Treatment",
        "Fertilisers",
        "Air",
        "Effects of Greenhouse Gases",
        "Reducing the Effects of Environmental Issues",
        "Photosynthesis",
      ],
    },
    {
      label: "11. Organic Chemistry",
      lessons: [
        "Organic Formulae",
        "Homologous Series",
        "Saturated & Unsaturated Compounds",
        "Naming Organic Compounds",
        "Fossil Fuels",
        "Alkanes",
        "Alkenes",
        "Addition Reactions",
        "Alcohols",
        "Carboxylic Acids",
        "Ethanoic Acid & Esterification Reactions",
        "Polymers",
        "Addition & Condensation Polymers",
        "Plastics & their Disposal",
        "Proteins",
      ],
    },
    {
      label: "12. Experimental Techniques & Chemical Analysis",
      lessons: [
        "Apparatus for Measurements",
        "Solutions",
        "Acid-Base Titrations",
        "Paper Chromatography",
        "Locating Agents & Rf Values",
        "Separation & Purification Techniques",
        "Identification of Anions",
        "Identification of Cations",
        "Identification of Gases",
      ],
    },
  ],
  phys: [
    {
      label: "1. Motion, Forces & Energy",
      lessons: [
        "Measurement",
        "Scalars & Vectors",
        "Calculating with Vectors",
        "Speed & Velocity",
        "Acceleration",
        "Distance-Time Graphs",
        "Speed-Time Graphs",
        "Calculating Acceleration from Speed-Time Graphs",
        "Freefall",
        "Mass & Weight",
        "Density",
        "Measuring Density",
        "Floating",
        "Resultant Forces",
        "Newton's First Law",
        "Newton's Second Law",
        "Investigating Force & Extension",
        "Hooke's Law",
        "Circular Motion",
        "Friction",
        "Moments",
        "Equilibrium",
        "Centre of Gravity",
        "Investigating Centre of Gravity",
        "Momentum",
        "Impulse",
        "Energy Stores & Transfers",
        "Kinetic Energy",
        "Gravitational Potential Energy",
        "Conservation of Energy",
        "Work Done",
        "Power",
        "Efficiency",
        "Energy from the Sun",
        "Energy from Fuels",
        "Energy from Water",
        "Geothermal Energy",
        "Nuclear Fusion",
        "Pressure & Forces",
        "Pressure in a Liquid",
      ],
    },
    {
      label: "2. Thermal Physics",
      lessons: [
        "States of Matter",
        "Molecular Matter",
        "Particle Model of Gases",
        "Brownian Motion",
        "Gases & Absolute Temperature",
        "Thermal Expansion",
        "Specific Heat Capacity",
        "Investigating Specific Heat Capacity",
        "Melting & Boiling",
        "Evaporation",
        "Demonstrating Conduction",
        "Thermal Conduction",
        "Convection",
        "Radiation",
        "The Greenhouse Effect",
        "Investigating IR Radiation",
        "Consequences of Thermal Energy Transfer",
      ],
    },
    {
      label: "3. Waves",
      lessons: [
        "Features of Waves",
        "The Wave Equation",
        "Transverse & Longitudinal Waves",
        "Wave Behaviour",
        "Ripple Tank",
        "Reflection of Light",
        "Investigating Reflection",
        "Refraction of Light",
        "Refractive Index",
        "Total Internal Reflection",
        "Ray Diagrams",
        "Real & Virtual Images",
        "Real Images",
        "Virtual Images",
        "Correcting Sight",
        "Dispersion of Light",
        "Electromagnetic Waves",
        "Uses of Electromagnetic Waves",
        "Dangers of Electromagnetic Waves",
        "Communications",
        "Digital & Analogue Signals",
        "Sound Waves",
        "Measuring the Speed of Sound",
        "Effects of Sound Waves",
        "Ultrasound",
      ],
    },
    {
      label: "4. Electricity & Magnetism",
      lessons: [
        "Magnetism",
        "Magnets",
        "Magnetic Fields",
        "Plotting Magnetic Fields",
        "Electric Charge",
        "Demonstrating Electric Charges",
        "Electric Fields",
        "Investigating Conductors & Insulators",
        "Current",
        "Direct & Alternating Current",
        "Electromotive Force",
        "Potential Difference",
        "Resistance",
        "Resistance of a Wire",
        "Electrical Energy",
        "Electrical Power",
        "Circuit Diagrams & Circuit Components",
        "Current in Circuits",
        "EMF & Potential Difference in Circuits",
        "Combined Resistance",
        "Potential Dividers",
        "Electrical Safety",
        "Electromagnetic Induction",
        "Demonstrating Induction",
        "The A.C. Generator",
        "Magnetic Effect of a Current",
        "Investigating the Field Around a Wire",
        "Force on a Current-Carrying Conductor",
        "Electric Motors",
        "Transformers",
        "Transformer Calculations",
      ],
    },
    {
      label: "5. Nuclear Physics",
      lessons: [
        "The Atom",
        "The Nucleus",
        "Protons, Neutrons & Electrons",
        "Fission & Fusion",
        "Background Radiation",
        "Types of Radiation",
        "Ionising Power & Deflection",
        "Radioactive Decay",
        "Half-Life",
        "Uses of Radiation",
        "Dangers of Radiation",
      ],
    },
    {
      label: "6. Space Physics",
      lessons: [
        "The Earth, Moon & Sun",
        "The Solar System",
        "Formation of the Solar System",
        "Light Speed Calculations",
        "Gravitational Field Strength",
        "Orbital Speed Equation",
        "Elliptical Orbits",
        "The Sun as a Star",
        "The Scale of the Universe",
        "Star Formation",
        "Life Cycle of a Star",
        "Galactic Redshift",
        "The Big Bang Theory",
        "Age of the Universe",
      ],
    },
  ],
} as const satisfies Record<
  Subject,
  readonly {
    label: string;
    lessons: readonly string[];
  }[]
>;

function slugifyKey(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function parseTopicLabel(label: string) {
  const match = label.match(/^(\d+)\.\s+(.+)$/);
  if (!match) throw new Error(`Invalid topic label: ${label}`);
  return { number: match[1], name: match[2] };
}

export const TOPICS: {
  key: string;
  label: string;
  subject: Subject;
  lessons: { key: string; label: string }[];
}[] = (["bio", "chem", "phys"] as const).flatMap((subject) =>
  RAW_TOPIC_CATALOG[subject].map((topic) => {
    const parsed = parseTopicLabel(topic.label);
    return {
      key: `${subject}-${parsed.number}-${slugifyKey(parsed.name)}`,
      label: topic.label,
      subject,
      lessons: topic.lessons.map((lesson) => ({
        key: `${subject}-${parsed.number}-${slugifyKey(lesson)}`,
        label: lesson,
      })),
    };
  }),
);

export const SKILLS: { key: string; label: string; sub: { key: string; label: string }[] }[] = [
  {
    key: "analysis",
    label: "Analysis",
    sub: [
      { key: "calculation", label: "Calculation" },
      { key: "extrapolation", label: "Extrapolation" },
      { key: "interpretation", label: "Interpretation" },
    ],
  },
  {
    key: "experimental",
    label: "Experimental",
    sub: [
      { key: "design", label: "Experiment Design" },
      { key: "errors", label: "Error Analysis" },
    ],
  },
  {
    key: "recall",
    label: "Recall",
    sub: [
      { key: "definitions", label: "Definitions" },
      { key: "diagrams", label: "Diagrams" },
    ],
  },
];

export const TAG_GROUPS: { label: string; tags: string[] }[] = [
  { label: "Importance", tags: ["important", "exam-favourite", "low-yield"] },
  { label: "Style", tags: ["wordy", "data-heavy", "diagram-heavy"] },
  { label: "Other", tags: ["tricky", "long", "short", "classic", "spicy"] },
];

export const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.tags);

export const TRAPS: { key: string; label: string }[] = [
  { key: "unit-mixup", label: "Unit Mix-up" },
  { key: "axis-mislabel", label: "Axis Mislabel" },
  { key: "sig-figs", label: "Sig. Figs" },
  { key: "double-negative", label: "Double Negative Wording" },
  { key: "cause-vs-correlation", label: "Cause vs Correlation" },
  { key: "off-by-one", label: "Off-by-one Reading" },
];

export const ALL_TRAPS = TRAPS.map((t) => t.key);
