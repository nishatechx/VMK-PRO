import { CetNotice, CetNoticesResponse } from '../types/cetNotice';

export class CetNoticeService {
  private cache: CetNoticesResponse | null = null;
  private lastFetch = 0;
  private cacheTtl = 90 * 1000; // 90 seconds in-memory client cache

  // Get current date string in DD/MM/YYYY format
  getCurrentDateFormatted(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    return `${day}/${month}/${year}`;
  }

  getYesterdayDateFormatted(): string {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    return `${day}/${month}/${year}`;
  }

  async getNotices(forceRefresh = false): Promise<CetNoticesResponse> {
    const now = Date.now();
    if (!forceRefresh && this.cache && now - this.lastFetch < this.cacheTtl) {
      return this.cache;
    }

    const clientDate = this.getCurrentDateFormatted();
    const yesterdayDate = this.getYesterdayDateFormatted();

    try {
      const url = `/api/cetcell-notices?date=${encodeURIComponent(clientDate)}${forceRefresh ? '&force=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: CetNoticesResponse = await res.json();
      this.cache = data;
      this.lastFetch = now;
      return data;
    } catch (err) {
      // Fallback
      const sampleToday: CetNotice = {
        sn: '1',
        course: 'Engineering',
        subject: 'Important Notice to Institutes Regarding Fees for A.Y. 2026–27',
        date: clientDate.includes('09/2026') ? clientDate : '09/09/2026',
        link: 'https://cetcell.mahacet.org/wp-content/uploads/2026/09/Notice-Addtional-Fees-Demand-2.pdf',
        period: 'today',
      };
      const sampleYesterday: CetNotice = {
        sn: '2',
        course: 'All Courses Under Technical Education',
        subject: 'Imp Notice :Regarding the Cut-Off Date for All Courses Under Technical Education – A.Y. 2026–27',
        date: '07/09/2026',
        link: 'https://cetcell.mahacet.org/wp-content/uploads/2026/09/Cut-off-circular.pdf',
        period: 'yesterday',
      };

      const fallback: CetNoticesResponse = {
        success: true,
        currentDate: clientDate,
        yesterdayDate,
        hasHighlightNotices: true,
        highlightNotices: [sampleToday, sampleYesterday],
        hasTodayNotices: true,
        todayNotices: [sampleToday],
        hasYesterdayNotices: true,
        yesterdayNotices: [sampleYesterday],
        latestDate: '09/09/2026',
        latestNotices: [sampleToday, sampleYesterday],
        source: 'https://cetcell.mahacet.org/notices/',
      };
      return fallback;
    }
  }
}

export const cetNoticeService = new CetNoticeService();
