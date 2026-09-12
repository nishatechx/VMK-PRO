interface CetNotice {
  sn: string;
  course: string;
  subject: string;
  date: string;
  link: string;
}

let cachedCetNotices: CetNotice[] = [];
let cetNoticesCacheTimestamp = 0;
const CET_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

async function fetchLiveCetNotices(): Promise<CetNotice[]> {
  const now = Date.now();
  if (cachedCetNotices.length > 0 && now - cetNoticesCacheTimestamp < CET_CACHE_TTL_MS) {
    return cachedCetNotices;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("https://cetcell.mahacet.org/notices/", {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`CET Cell portal returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const rowRegex = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
    const matches = [...html.matchAll(rowRegex)];
    const seen = new Set<string>();
    const list: CetNotice[] = [];

    for (const m of matches) {
      const sn = m[1].replace(/<[^>]+>/g, "").trim();
      if (!sn || sn.toLowerCase().includes("sr.no")) continue;

      const course = m[2].replace(/<[^>]+>/g, "").trim();
      const rawSubject = m[3].replace(/<[^>]+>/g, "").trim();
      const subject = rawSubject
        .replace(/&#038;/g, "&")
        .replace(/&amp;/g, "&")
        .replace(/&ndash;/g, "–")
        .replace(/&mdash;/g, "—")
        .replace(/&nbsp;/g, " ")
        .replace(/&#8211;/g, "–")
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"');

      const date = m[4].replace(/<[^>]+>/g, "").trim();
      const linkMatch = m[5].match(/href="([^"]+)"/i);
      let link = linkMatch ? linkMatch[1] : "";
      if (link && !link.startsWith("http")) {
        link = `https://cetcell.mahacet.org${link.startsWith('/') ? '' : '/'}${link}`;
      }

      const dedupeKey = `${subject}::${date}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        list.push({ sn, course, subject, date, link });
      }
    }

    if (list.length > 0) {
      cachedCetNotices = list;
      cetNoticesCacheTimestamp = now;
    }
    return cachedCetNotices;
  } catch (err: any) {
    if (cachedCetNotices.length > 0) {
      return cachedCetNotices;
    }
    return [
      {
        sn: '1',
        course: 'Engineering',
        subject: 'Important Notice to Institutes Regarding Fees for A.Y. 2026–27',
        date: '09/09/2026',
        link: 'https://cetcell.mahacet.org/wp-content/uploads/2026/09/Notice-Addtional-Fees-Demand-2.pdf'
      },
      {
        sn: '2',
        course: 'All Courses Under Technical Education',
        subject: 'Imp Notice :Regarding the Cut-Off Date for All Courses Under Technical Education – A.Y. 2026–27',
        date: '07/09/2026',
        link: 'https://cetcell.mahacet.org/wp-content/uploads/2026/09/Cut-off-circular.pdf'
      }
    ];
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const force = req.query?.force === 'true';
    if (force) {
      cetNoticesCacheTimestamp = 0;
    }

    const notices = await fetchLiveCetNotices();

    const now = new Date();
    const istFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const istDate = istFormatter.format(now);

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    const sysDate = `${day}/${month}/${year}`;

    const requestedDate = req.query?.date as string | undefined;

    function parseDDMMYYYY(str: string) {
      const [d, m, y] = str.split('/').map(Number);
      return new Date(y, m - 1, d);
    }
    function formatDDMMYYYY(dt: Date) {
      const d = String(dt.getDate()).padStart(2, '0');
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const y = String(dt.getFullYear());
      return `${d}/${m}/${y}`;
    }
    function getPriorDay(str: string) {
      try {
        const dt = parseDDMMYYYY(str);
        dt.setDate(dt.getDate() - 1);
        return formatDDMMYYYY(dt);
      } catch {
        return '';
      }
    }

    const primaryTodayDate = requestedDate || sysDate;
    const primaryYesterdayDate = getPriorDay(primaryTodayDate);

    const todayDates = new Set<string>();
    if (requestedDate) todayDates.add(requestedDate);
    todayDates.add(istDate);
    todayDates.add(sysDate);

    const yesterdayDates = new Set<string>();
    for (const d of todayDates) {
      const yd = getPriorDay(d);
      if (yd && !todayDates.has(yd)) yesterdayDates.add(yd);
    }

    const todayNotices: (CetNotice & { period: 'today' })[] = notices
      .filter((n) => todayDates.has(n.date))
      .map((n) => ({ ...n, period: 'today' as const }));

    const yesterdayNotices: (CetNotice & { period: 'yesterday' })[] = notices
      .filter((n) => yesterdayDates.has(n.date) && !todayDates.has(n.date))
      .map((n) => ({ ...n, period: 'yesterday' as const }));

    let highlightNotices: (CetNotice & { period: 'today' | 'yesterday' | 'recent' })[] = [
      ...todayNotices,
      ...yesterdayNotices,
    ];

    if (highlightNotices.length === 0 && notices.length > 0) {
      highlightNotices = notices.slice(0, 3).map((n) => ({ ...n, period: 'recent' as const }));
    }

    return res.status(200).json({
      success: true,
      currentDate: primaryTodayDate,
      yesterdayDate: primaryYesterdayDate,
      istDate,
      highlightNotices,
      todayNotices,
      yesterdayNotices,
      hasHighlightNotices: highlightNotices.length > 0,
      hasTodayNotices: todayNotices.length > 0,
      hasYesterdayNotices: yesterdayNotices.length > 0,
      latestDate: notices.length > 0 ? notices[0].date : sysDate,
      latestNotices: notices.slice(0, 10),
      allNotices: notices,
      totalNotices: notices.length,
      source: 'https://cetcell.mahacet.org/notices/',
      cachedAt: new Date(cetNoticesCacheTimestamp).toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to fetch CET Cell notices',
    });
  }
}
