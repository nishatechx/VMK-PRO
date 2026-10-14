export type TabPermission =
  | 'dashboard'
  | 'facilitation_tools'
  | 'candidates'
  | 'tickets'
  | 'events_camps'
  | 'counsellor_tools'
  | 'reports'
  | 'notices_circulars'
  | 'knowledge_base'
  | 'settings'
  | 'visitors'
  | 'students'
  | 'profile'
  | 'user_management'
  | 'google_sheets';

export type FeaturePermission =
  | 'whatsapp_tool'
  | 'qr_upload_tool'
  | 'ticket_generator_tool'
  | 'img_to_pdf_tool'
  | 'image_to_text_tool'
  | 'add_candidate'
  | 'add_visitor'
  | 'export_reports';

export type UserRole = 'super_admin' | 'dno' | 'counsellor' | 'supporting_staff' | 'operator' | 'student';

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketType = 'candidate_ticket' | 'whatsapp_ticket';

export interface TicketRecord {
  id: string; // Unique ticket record ID
  ticketNo: string; // e.g. TC-FC1102-20260902-1234 or WA-CAP-2026-981240
  ticketType: TicketType;
  subject?: string; // Automatically derived subject based on the nature of query
  candidateName: string;
  cetNo?: string;
  capId?: string;
  dob?: string;
  mobile: string;
  email?: string;
  course: string;
  scrutinyMode?: string;
  query: string;
  formattedText: string;
  status: TicketStatus;
  priority?: 'Normal' | 'Urgent' | 'High';
  resolutionNotes?: string;
  createdBy: string; // username of the counsellor/officer
  creatorName: string; // full display name
  creatorRole: string; // counsellor, supporting_staff, dno
  district?: string; // e.g. "Washim", "Akola", etc.
  createdAt: string; // ISO timestamp
  updatedAt?: string;
}

export interface UserProfile {
  id: string; // Unique user identifier (synced with Firebase UID)
  uid?: string; // Firebase Auth UID alias for seamless cross-environment compatibility
  username: string;
  password: string;
  fullName: string;
  designation: string;
  role: UserRole;
  district?: string; // Assigned administrative district (e.g. "Washim", "Akola")
  allowedTabs: TabPermission[];
  allowedFeatures: FeaturePermission[];
  canUseApiKey?: boolean; // Granted by DNO to access the master Gemini Vision API key
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  phone?: string;
  email?: string;
  profilePicture?: string;
  permissionVersion?: number; // Tracks version of permission changes for instant sync & cache invalidation
  restrictedFeatures?: FeaturePermission[]; // Granular tool restrictions set by Super Admin
}

export interface StudentRecord {
  id: string; // e.g. EN24109432
  applicationId?: string; // alias for id
  name: string;
  candidateName?: string; // alias for name
  mobile: string;
  email?: string;
  course: string;
  mode: 'E-Scrutiny' | 'Physical Scrutiny';
  scrutinyMode?: 'E-Scrutiny' | 'Physical Scrutiny'; // alias for mode
  status: 'Verified' | 'Objection Raised' | 'Document Pending';
  date: string;
  remarks: string;
  cetRegNo?: string;
  category?: string;
  scrutinyOfficer?: string;
  district?: string; // Assigned district (e.g. "Washim", "Akola")
  createdBy?: string; // Username of creator
  createdAt: string;
}

export interface CenterNotice {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'info' | 'success' | 'warning';
  createdAt: string;
}

export type VisitorType = 'Candidate' | 'Parent' | 'Institute' | 'Other';

export interface VisitorRecord {
  id: string;
  srNo: number;
  date: string; // e.g. "2026-08-24" or "24 Aug 2026"
  timestamp: string; // formatted e.g. "24 Aug 2026, 10:45 AM"
  name: string;
  mobile: string;
  visitorType: VisitorType;
  address: string; // Village / City / District / Institute
  purpose: string; // Reason for visit e.g. Document Scrutiny, Objection Resolution, etc.
  checkInTime: string; // e.g. "10:30 AM"
  checkOutTime?: string; // e.g. "11:15 AM" or undefined if on premises
  status: 'In Premises' | 'Checked Out';
  candidateAppId?: string; // e.g. "EN24109432"
  remarks?: string;
  district?: string; // Assigned district (e.g. "Washim", "Akola")
  createdBy?: string; // Username of creator
  createdAt: string;
}
