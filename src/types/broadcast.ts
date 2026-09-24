export type BroadcastPriority = 'urgent' | 'important' | 'info';

export type BroadcastTargetRole = 'all' | 'counsellor' | 'supporting_staff';

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  senderName: string;
  senderRole: 'super_admin' | 'dno';
  senderDistrict?: string;
  createdAt: string;
  targetRoles: BroadcastTargetRole[];
  targetDistrict?: string; // 'all' or specific district e.g. 'Washim'
  isActive: boolean;
  priority: BroadcastPriority;
}
