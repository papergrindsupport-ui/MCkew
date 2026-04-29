// Reference data used by the profile UI: pre-seeded school names and a
// curated list of preset flairs (badges). Real user profiles now live in
// the backend — there are no more in-memory dummy users.

export const SCHOOLS_SEED: string[] = [
  "Westwood Academy",
  "Riverside International",
  "Heidelberg Gymnasium",
  "Tokyo Prep",
  "Cairo British School",
  "Lahore Grammar School",
  "Dubai International Academy",
  "Singapore American School",
  "Lycée Français de Londres",
  "American School of Paris",
];

export const PRESET_FLAIRS: {
  label: string;
  icon: string;
  color: "pink" | "blue" | "green" | "yellow" | "purple" | "primary";
}[] = [
  { label: "Early bird", icon: "Sunrise", color: "yellow" },
  { label: "Night owl", icon: "Moon", color: "purple" },
  { label: "Bio nerd", icon: "Leaf", color: "green" },
  { label: "Chem wizard", icon: "FlaskConical", color: "blue" },
  { label: "Phys phenom", icon: "Atom", color: "blue" },
  { label: "Speedrunner", icon: "Zap", color: "primary" },
  { label: "Streak king", icon: "Flame", color: "pink" },
  { label: "Top 10", icon: "Trophy", color: "yellow" },
  { label: "Mentor", icon: "GraduationCap", color: "purple" },
  { label: "Volunteer", icon: "HeartHandshake", color: "pink" },
  { label: "Bookworm", icon: "BookOpen", color: "green" },
  { label: "Caffeine fueled", icon: "Coffee", color: "primary" },
];
