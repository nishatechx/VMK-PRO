export interface CourseCategory {
  department: string;
  subCategory?: string;
  courses: string[];
}

export const DEPARTMENT_COURSES: CourseCategory[] = [
  {
    department: '1. Technical Education',
    subCategory: 'Post Graduate Courses',
    courses: [
      'MBA / MMS',
      'MCA',
      'M.E. / M.Tech',
      'M.E. / M.Tech (Working Professionals)',
      'M.Architecture',
      'M.HMCT',
      'M.Pharmacy / Pharm.D (Post Baccalaureate)',
      'MCA Second Year (Lateral Entry)',
      'MCA (Working Professionals)',
      'MBA Second Year (Lateral Entry)',
      'MBA/MMS (Working Professionals)',
    ],
  },
  {
    department: '1. Technical Education',
    subCategory: 'Under Graduate Courses',
    courses: [
      'B.E. / B.Tech',
      'BCA / MCA (Integrated)',
      'BBA / BMS / BBM / MBA (Integrated)',
      'B.Pharmacy / Pharm.D',
      'B.Architecture',
      'B.HMCT / M.HMCT (Integrated)',
      'Direct Second Year Engineering (DSE)',
      'Direct Second Year Engineering (Working Professional)',
      'Direct Second Year Pharmacy (DSP)',
      'B.Planning',
      'B.Design',
      'Direct Second Year Degree in HMCT',
      'B.Pharmacy (Practice)',
      'Direct Third Year Degree in Engineering',
      'Direct Final Year Degree in Engineering',
    ],
  },
  {
    department: '2. Agriculture Education',
    subCategory: 'Agriculture & Allied Courses',
    courses: [
      'B.F.Sc. (Fishery Science)',
      'B.Sc. (Hons) Agriculture',
      'B.Sc. (Hons) Horticulture',
      'B.Sc. (Hons) Community Science',
      'B.Sc. (Hons) Agri-Business Management',
      'B.Sc. (Hons) Forestry',
      'B.Tech. (Agricultural Engineering)',
      'B.Tech. (Food Technology)',
      'B.Tech. (Biotechnology)',
      'Direct Second Year of Bachelor of Science (Agriculture)',
    ],
  },
  {
    department: '3. Fine Art Education',
    subCategory: 'Fine Art Courses',
    courses: [
      'Fine Art',
    ],
  },
  {
    department: '4. Higher Education',
    subCategory: 'Post Graduate Courses',
    courses: [
      'M.Ed.',
      'M.P.Ed.',
      'B.Ed. M.Ed. Integrated',
    ],
  },
  {
    department: '4. Higher Education',
    subCategory: 'Under Graduate Courses',
    courses: [
      'L.L.B. – 5 Years (Integrated)',
      'L.L.B. – 3 Years',
      'B.Ed.',
      'B.P.Ed.',
    ],
  },
  {
    department: '5. Medical Education',
    subCategory: 'Post Graduate Courses',
    courses: [
      'NEET-PGM',
      'PG DNB',
      'NEET-PGD',
      'PGP / PGO / PGASLP / M.Sc. (P&O)',
    ],
  },
  {
    department: '5. Medical Education',
    subCategory: 'Under Graduate Courses',
    courses: [
      'NEET-UG',
      'B.Sc. Nursing',
      'GNM',
      'DPN-PHN',
      'AIQ (15%) for AYUSH Courses',
    ],
  },
  {
    department: '6. AYUSH Education',
    subCategory: 'AYUSH Courses',
    courses: [
      'AIAPGET (PGA / PGH / PGU) – State Quota',
      'AIAPGET (PGA / PGH / PGU) – AIQ (15% Quota)',
    ],
  },
  {
    department: '7. Foreign Candidate Admission',
    subCategory: 'Foreign Candidate Admission',
    courses: [
      'Foreign Candidate Registration',
    ],
  },
];

export const ALL_COURSES: string[] = DEPARTMENT_COURSES.flatMap((group) => group.courses);
export const DEFAULT_COURSE = 'B.E. / B.Tech';
