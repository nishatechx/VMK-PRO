export interface CetNotice {
  sn: string;
  course: string;
  subject: string;
  date: string;
  link: string;
  period?: 'today' | 'yesterday' | 'recent';
}

export interface CetNoticesResponse {
  success: boolean;
  currentDate: string;
  yesterdayDate: string;
  istDate?: string;
  highlightNotices: CetNotice[];
  todayNotices: CetNotice[];
  yesterdayNotices: CetNotice[];
  hasHighlightNotices: boolean;
  hasTodayNotices: boolean;
  hasYesterdayNotices: boolean;
  latestDate?: string;
  latestNotices?: CetNotice[];
  allNotices?: CetNotice[];
  totalNotices?: number;
  source: string;
  error?: string;
}
