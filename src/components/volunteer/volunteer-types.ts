// Types and shared store for volunteer applications (backend-backed).
//
// Submissions go to /api/volunteer-applications via the API client. The
// localStorage code path was removed — applications now persist to the
// `volunteer_applications` table (anyone can submit; signed-in users can
// see their own history).
import { createApiClient } from "@/lib/apiClient";

export type ContactMethodType = "phone" | "email" | "social" | "other";
export type PhoneSubtype = "mobile" | "whatsapp" | "other";
export type SocialPlatform =
  | "instagram"
  | "twitter"
  | "facebook"
  | "reddit"
  | "tiktok"
  | "linkedin"
  | "discord"
  | "telegram"
  | "snapchat"
  | "other";

export interface PhoneContact {
  kind: "phone";
  countryCode: string;
  dialCode: string;
  number: string;
  subtype: PhoneSubtype;
  customSubtype?: string;
}
export interface EmailContact {
  kind: "email";
  email: string;
}
export interface SocialContact {
  kind: "social";
  platform: SocialPlatform;
  username: string;
  customPlatform?: string;
  customLink?: string;
}
export interface OtherContact {
  kind: "other";
  label: string;
  value: string;
  link?: string;
}
export type ContactMethod = PhoneContact | EmailContact | SocialContact | OtherContact;

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export type SubjectChoice =
  | { subject: "biology"; level: "igcse" | "ial" }
  | { subject: "chemistry" }
  | { subject: "physics" };

export type VolunteerRole =
  | "past-papers-extractor"
  | "customer-service"
  | "feature-tester"
  | "other";

export interface VolunteerApplication {
  id: string;
  userId: string | null;
  fullName: string;
  contactMethods: ContactMethod[];
  dateOfBirth?: string;
  availableFrom?: string;
  availableTo?: string;
  hoursPerDay: number;
  subjects: SubjectChoice[];
  educationLevel?: string;
  customEducation?: string;
  nationality?: string;
  livesInHomeCountry: boolean;
  currentLocation?: string;
  customFields: CustomField[];
  applicationMessage: any;
  role: VolunteerRole;
  customRole?: string;
  acceptedTerms: boolean;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

// Map an API row (snake_case) onto the camelCase UI shape.
function mapRow(row: any): VolunteerApplication {
  return {
    id: row.id,
    userId: row.profile_id ?? null,
    fullName: row.full_name,
    contactMethods: row.contact_methods ?? [],
    dateOfBirth: row.date_of_birth ?? undefined,
    availableFrom: row.available_from ?? undefined,
    availableTo: row.available_to ?? undefined,
    hoursPerDay: row.hours_per_day ?? 0,
    subjects: row.subjects ?? [],
    educationLevel: row.education_level ?? undefined,
    customEducation: row.custom_education ?? undefined,
    nationality: row.nationality ?? undefined,
    livesInHomeCountry: !!row.lives_in_home_country,
    currentLocation: row.current_location ?? undefined,
    customFields: row.custom_fields ?? [],
    applicationMessage: row.application_message ?? null,
    role: row.role,
    customRole: row.custom_role ?? undefined,
    acceptedTerms: !!row.accepted_terms,
    status: row.status ?? "pending",
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

// NOTE: callers using the public client (no auth) get an empty list back —
// the API only returns history for the signed-in profile.
export async function loadApplications(_userId: string | null): Promise<VolunteerApplication[]> {
  try {
    const api = createApiClient();
    const { data } = await api.listVolunteerApplications();
    return (data ?? []).map(mapRow);
  } catch {
    return [];
  }
}

export async function saveApplication(app: VolunteerApplication): Promise<VolunteerApplication> {
  const api = createApiClient();
  const { data } = await api.submitVolunteerApplication({
    fullName: app.fullName,
    contactMethods: app.contactMethods as unknown as Record<string, unknown>[],
    dateOfBirth: app.dateOfBirth,
    availableFrom: app.availableFrom,
    availableTo: app.availableTo,
    hoursPerDay: app.hoursPerDay,
    subjects: app.subjects as unknown as Record<string, unknown>[],
    educationLevel: app.educationLevel,
    customEducation: app.customEducation,
    nationality: app.nationality,
    livesInHomeCountry: app.livesInHomeCountry,
    currentLocation: app.currentLocation,
    customFields: app.customFields,
    applicationMessage: app.applicationMessage,
    role: app.role,
    customRole: app.customRole,
    acceptedTerms: app.acceptedTerms,
  });
  return mapRow(data);
}

export const ROLE_INFO: Record<
  VolunteerRole,
  { name: string; tagline: string; emoji: string; description: string }
> = {
  "past-papers-extractor": {
    name: "Paper Archaeologist",
    tagline: "Past-Papers Extraction",
    emoji: "📜",
    description:
      "You'll dig through past exam papers, extract questions and mark schemes, and structure them so future students can practice. Detail-oriented work that directly helps thousands of learners.",
  },
  "customer-service": {
    name: "Friendly Hero",
    tagline: "Customer Service",
    emoji: "💬",
    description:
      "Be the warm voice that answers questions on Discord, email, and our help channels. You'll guide students, calm anxious parents, and make Smart Solve feel human.",
  },
  "feature-tester": {
    name: "Bug Hunter",
    tagline: "Feature Tester",
    emoji: "🔍",
    description:
      "Get early access to new features, break them creatively, and write up what you found. Your feedback shapes what ships to everyone. Note: this is QA — not development.",
  },
  other: {
    name: "Wildcard",
    tagline: "Something Else",
    emoji: "✨",
    description: "Have a skill we haven't thought of? Tell us how you'd like to contribute.",
  },
};

export const SUBJECTS = [
  {
    id: "biology-igcse",
    label: "Biology (IGCSE)",
    subject: "biology" as const,
    level: "igcse" as const,
    emoji: "🧬",
  },
  {
    id: "biology-ial",
    label: "Biology (IAL)",
    subject: "biology" as const,
    level: "ial" as const,
    emoji: "🧬",
  },
  { id: "chemistry", label: "Chemistry", subject: "chemistry" as const, emoji: "🧪" },
  { id: "physics", label: "Physics", subject: "physics" as const, emoji: "⚛️" },
];

export const EDUCATION_LEVELS = [
  "Currently in school (KS3/KS4)",
  "IGCSE / O-Level student",
  "A-Level / IAL student",
  "University undergraduate",
  "University graduate",
  "Postgraduate / Masters",
  "PhD / Doctorate",
  "Teacher / Educator",
  "Other",
];
