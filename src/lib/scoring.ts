import type { Lead } from "./types";

/**
 * Exact Lead Scoring Algorithm as per requirements:
 * - Budget > 12k: +20
 * - Move-in < 7 days: +30
 * - Source = Referral: +15
 * - Confidence (manual) > 70: +25
 * Final score capped at 0-100.
 */
export function calculateLeadScore(lead: Lead, now: number): number {
  let score = 0;

  // 1. Budget weightage
  if (lead.budget > 12000) {
    score += 20;
  }

  // 2. Move-in weightage
  const moveInDate = new Date(lead.moveInDate).getTime();
  const diffDays = (moveInDate - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) {
    score += 30;
  }

  // 3. Source weightage
  if (lead.source === "Referral") {
    score += 15;
  }

  // 4. Manual confidence weightage
  if (lead.confidence > 70) {
    score += 25;
  }

  return Math.max(0, Math.min(100, score));
}
