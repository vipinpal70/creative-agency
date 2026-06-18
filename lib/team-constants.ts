// lib/team-constants.ts — browser-safe constants (no mongoose imports)

export type TeamMemberRole =
  | "ADMIN"
  | "CREATIVE_LEAD"
  | "OPERATION_LEAD"
  | "SALESPERSON"
  | "ACCOUNT_MANAGER"
  | "COPYWRITER"
  | "CONTENT_WRITER"
  | "GRAPHIC_DESIGNER"
  | "VIDEO_EDITOR"
  | "SEO_SPECIALIST"
  | "PERFORMANCE_MARKETING_SPECIALIST"
  | "EMAIL_MARKETING_SPECIALIST"
  | "WHATSAPP_MARKETING_SPECIALIST";

export type TeamMemberStatus = "active" | "inactive";
export type TeamMemberType = "internal" | "outsource";

export const TEAM_ROLES: TeamMemberRole[] = [
  "ADMIN",
  "CREATIVE_LEAD",
  "OPERATION_LEAD",
  "SALESPERSON",
  "ACCOUNT_MANAGER",
  "COPYWRITER",
  "CONTENT_WRITER",
  "GRAPHIC_DESIGNER",
  "VIDEO_EDITOR",
  "SEO_SPECIALIST",
  "PERFORMANCE_MARKETING_SPECIALIST",
  "EMAIL_MARKETING_SPECIALIST",
  "WHATSAPP_MARKETING_SPECIALIST",
];

export const ROLE_DISPLAY_NAMES: Record<TeamMemberRole, string> = {
  ADMIN: "Admin",
  CREATIVE_LEAD: "Creative Lead",
  OPERATION_LEAD: "Operation Lead",
  SALESPERSON: "Salesperson",
  ACCOUNT_MANAGER: "Account Manager",
  COPYWRITER: "Copywriter",
  CONTENT_WRITER: "Content Writer",
  GRAPHIC_DESIGNER: "Graphic Designer",
  VIDEO_EDITOR: "Video Editor",
  SEO_SPECIALIST: "SEO Specialist",
  PERFORMANCE_MARKETING_SPECIALIST: "Performance Marketing Specialist",
  EMAIL_MARKETING_SPECIALIST: "Email Marketing Specialist",
  WHATSAPP_MARKETING_SPECIALIST: "WhatsApp Marketing Specialist",
};

export const AVATAR_COLORS = [
  "#16A34A", "#15803D", "#22C55E", "#10B981",
  "#3B82F6", "#F59E0B", "#14b8a6", "#64748B",
];

export function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}
