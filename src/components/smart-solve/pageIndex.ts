// Static index of top-level pages for global search.

import {
  LuHouse,
  LuFileText,
  LuLayoutDashboard,
  LuLeaf,
  LuFlaskConical,
  LuAtom,
  LuLayers,
} from "react-icons/lu";
import type { PageResult } from "./SearchResultPreview";

export const PAGE_INDEX: PageResult[] = [
  {
    title: "Home",
    description: "Landing page with hero, features, testimonials.",
    to: "/",
    keywords: ["home", "landing", "start", "hero"],
    icon: LuHouse,
  },
  {
    title: "Past Papers",
    description: "Browse every past paper in your chosen layout.",
    to: "/smart-solve-papers",
    keywords: ["papers", "past paper", "exam", "bento", "multistep"],
    icon: LuFileText,
  },
  {
    title: "Dashboard",
    description: "Your progress and settings.",
    to: "/dashboard",
    keywords: ["dashboard", "stats", "progress", "profile", "settings"],
    icon: LuLayoutDashboard,
  },
  {
    title: "Biology",
    description: "Smart solve biology questions across all papers.",
    to: "/smart-solve-bio",
    keywords: ["biology", "bio", "cells", "enzymes"],
    icon: LuLeaf,
  },
  {
    title: "Chemistry",
    description: "Smart solve chemistry questions across all papers.",
    to: "/smart-solve-chem",
    keywords: ["chemistry", "chem", "reaction", "atom", "periodic"],
    icon: LuFlaskConical,
  },
  {
    title: "Physics",
    description: "Smart solve physics questions across all papers.",
    to: "/smart-solve-phys",
    keywords: ["physics", "phys", "force", "energy", "motion"],
    icon: LuAtom,
  },
  {
    title: "All Subjects",
    description: "Smart solve across biology, chemistry, and physics.",
    to: "/smart-solve-all",
    keywords: ["all", "everything", "mix", "combined"],
    icon: LuLayers,
  },
];

export function matchPage(page: PageResult, q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  const hay = [page.title, page.description, ...page.keywords].join(" ").toLowerCase();
  // split query into words, each must appear somewhere
  return query.split(/\s+/).every((w) => hay.includes(w));
}
