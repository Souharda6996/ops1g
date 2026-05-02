import type { Lead, LeadStage } from "./types";

/**
 * Exact Overdue Logic as per requirements:
 * - New: Overdue if updated > 2 hours ago
 * - Contacted: Overdue if updated > 24 hours ago
 * - Tour Done: Overdue if updated > 6 hours ago
 * - Negotiation: Overdue if updated > 12 hours ago
 */
export function isLeadOverdue(lead: Lead, now: number): boolean {
  const updatedTs = new Date(lead.updatedAt).getTime();
  const elapsedHours = (now - updatedTs) / (1000 * 60 * 60);

  switch (lead.stage) {
    case "new":
      return elapsedHours > 2;
    case "qualified":
      return elapsedHours > 24;
    case "tour-done":
      return elapsedHours > 6;
    case "follow-up":
      return elapsedHours > 12;
    default:
      return false;
  }
}

/**
 * Returns the SLA threshold in hours for a given stage
 */
export function getStageSlaHours(stage: LeadStage): number | null {
  switch (stage) {
    case "new": return 2;
    case "qualified": return 24;
    case "tour-done": return 6;
    case "follow-up": return 12;
    default: return null;
  }
}
