export interface MotivationalQuote {
  id: number;
  category: string;
  quote: string;
  supportingLine: string;
}

export interface DailyQuoteRecord {
  userId: string;
  userKey: string;
  date: string; // YYYY-MM-DD in Asia/Kolkata timezone
  quoteId: number;
  quote: MotivationalQuote;
  displayedAt: string; // ISO 8601 timestamp
  deviceSessionId?: string;
}

export interface QuotesCollection {
  name: string;
  version: number;
  language: string;
  description: string;
  quotes: MotivationalQuote[];
}
