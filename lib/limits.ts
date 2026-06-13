// Single source of truth for AI usage limits and payload caps. Imported by
// the API routes (enforcement) and the admin dashboard (documentation) so the
// two can never drift.

export const LIMITS = {
  chatPerDay: 60,
  interpretPerDay: 12,
  chatHistoryMessages: 20,
  chatMessageChars: 4000,
  chatContextChars: 30000,
  chatMaxOutputTokens: 2500,
  sheetTotalChars: 250000,
  estChatCostUsd: 0.02,
} as const;
