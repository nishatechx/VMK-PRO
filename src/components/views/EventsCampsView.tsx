import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  Plus,
  Filter,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  CalendarDays,
  Download,
  Eye,
  Trash2,
  X,
  FileText,
  Building2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { UserProfile } from '../../types/auth';

export interface CenterEvent {
  id: string;
  title: string;
  eventType: 'Guidance Seminar' | 'Admission Camp' | 'Scrutiny Drive' | 'School Outreach' | 'Document Helpdesk';
  date: string;
  time: string;
  location: string;
  venueAddress: string;
  targetAudience: string;
  expectedAttendees: number;
  registeredAttendees: number;
  status: 'Upcoming' | 'Active' | 'Completed' | 'Postponed';
  organizer: string;
  contactPerson: string;
  contactPhone: string;
  notes?: string;
  district: string;
  createdAt: string;
}

const DEFAULT_EVENTS: CenterEvent[] = [
  {
    id: 'evt-01',
    title: 'MHT-CET & CAP Option Form Guidance Seminar',
    eventType: 'Guidance Seminar',
    date: '2026-10-18',
    time: '10:30 AM – 1:30 PM',
    location: 'Washim District Auditorium',
    venueAddress: 'Near Collector Office, Civil Lines, Washim',
    targetAudience: 'HSC Passed Students & Parents (Engineering / Pharmacy)',
    expectedAttendees: 350,
    registeredAttendees: 284,
    status: 'Upcoming',
    organizer: 'Facilitation Center FC-1102 & DNO Washim',
    contactPerson: 'P. D. Deshmukh',
    contactPhone: '+91 98220 12345',
    notes: 'Free official brochure distribution, option form demo, and reservation matrix walkthrough.',
    district: 'Washim',
    createdAt: '2026-10-01T09:00:00.000Z',
  },
  {
    id: 'evt-02',
    title: 'Rural Scrutiny & Caste Validity Helpdesk Camp',
    eventType: 'Admission Camp',
    date: '2026-10-15',
    time: '09:30 AM – 5:00 PM',
    location: 'Karanja Lad Tehsil Office Community Hall',
    venueAddress: 'Main Road, Karanja, Dist. Washim',
    targetAudience: 'Reserved Category Candidates (OBC, SC, ST, VJ/NT, SEBC, EWS)',
    expectedAttendees: 200,
    registeredAttendees: 172,
    status: 'Upcoming',
    organizer: 'FC-1102 Mobile Scrutiny Unit',
    contactPerson: 'S. G. Kulkarni',
    contactPhone: '+91 94231 98765',
    notes: 'On-spot document scanner & QR upload facility will be operational.',
    district: 'Washim',
    createdAt: '2026-10-02T10:00:00.000Z',
  },
  {
    id: 'evt-03',
    title: 'Junior College Admission Awareness Drive',
    eventType: 'School Outreach',
    date: '2026-10-10',
    time: '11:00 AM – 2:00 PM',
    location: 'R. A. Arts & M. K. Commerce College, Risod',
    venueAddress: 'Risod Road, Washim District',
    targetAudience: 'Class 12th Science & Commerce Students',
    expectedAttendees: 180,
    registeredAttendees: 180,
    status: 'Completed',
    organizer: 'Counselling Cell FC-1102',
    contactPerson: 'Dr. V. N. Patil',
    contactPhone: '+91 98900 11223',
    notes: 'Completed successfully with 180 student registrations and ticket notes generated.',
    district: 'Washim',
    createdAt: '2026-09-28T09:00:00.000Z',
  },
  {
    id: 'evt-04',
    title: 'Agriculture & MBA CAP E-Scrutiny Special Camp',
    eventType: 'Scrutiny Drive',
    date: '2026-10-22',
    time: '10:00 AM – 4:00 PM',
    location: 'Govt. Polytechnic Washim Campus',
    venueAddress: 'Risod Road, Washim 444505',
    targetAudience: 'B.Sc. Agriculture & MBA/MMS Aspirants',
    expectedAttendees: 150,
    registeredAttendees: 96,
    status: 'Upcoming',
    organizer: 'FC-1102 Nodal Staff',
    contactPerson: 'P. D. Deshmukh',
    contactPhone: '+91 98220 12345',
    notes: 'Focus on 7/12 agriculturist certificates and quota verification.',
    district: 'Washim',
    createdAt: '2026-10-05T11:00:00.000Z',
  },
];

const LOCAL_STORAGE_KEY = 'vmk_center_events_data';

interface EventsCampsViewProps {
  currentUser?: UserProfile | null;
}

export const EventsCampsView: React.FC<EventsCampsViewProps> = ({ currentUser }) => {
  const [events, setEvents] = useState<CenterEvent[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return DEFAULT_EVENTS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState<CenterEvent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form states for new event
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<CenterEvent['eventType']>('Guidance Seminar');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [newExpected, setNewExpected] = useState<number>(100);
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Ignore
    }
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.targetAudience.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'All' || e.eventType === typeFilter;
      const matchStatus = statusFilter === 'All' || e.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [events, searchTerm, typeFilter, statusFilter]);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate || !newLocation.trim()) return;

    const newEvt: CenterEvent = {
      id: `evt-${Date.now()}`,
      title: newTitle.trim(),
      eventType: newType,
      date: newDate,
      time: newTime || '10:00 AM – 2:00 PM',
      location: newLocation.trim(),
      venueAddress: newVenue.trim() || newLocation.trim(),
      targetAudience: newAudience.trim() || 'HSC & Diploma Admission Aspirants',
      expectedAttendees: Number(newExpected) || 100,
      registeredAttendees: 0,
      status: 'Upcoming',
      organizer: `FC-1102 & ${currentUser?.fullName || 'Nodal Staff'}`,
      contactPerson: newContact.trim() || currentUser?.fullName || 'Center Coordinator',
      contactPhone: newPhone.trim() || '+91 98220 12345',
      notes: newNotes.trim() || undefined,
      district: currentUser?.district || 'Washim',
      createdAt: new Date().toISOString(),
    };

    setEvents((prev) => [newEvt, ...prev]);
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewLocation('');
    setNewVenue('');
    setNewAudience('');
    setNewNotes('');
  };

  const handleDeleteEvent = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete camp "${title}"?`)) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (selectedEvent?.id === id) setSelectedEvent(null);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Title', 'Event Type', 'Date', 'Time', 'Location', 'Status', 'Registered / Expected', 'Contact'];
    const rows = filteredEvents.map((e) => [
      `"${e.title.replace(/"/g, '""')}"`,
      e.eventType,
      e.date,
      `"${e.time}"`,
      `"${e.location.replace(/"/g, '""')}"`,
      e.status,
      `${e.registeredAttendees} / ${e.expectedAttendees}`,
      `"${e.contactPerson} (${e.contactPhone})"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `events_camps_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-5 pb-8 select-none font-sans">
      {/* Header */}
      <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0]">
              Outreach & Guidance
            </span>
            <span className="text-xs text-[#62738D]">Center FC-1102 &bull; Washim District</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#102544] tracking-tight mt-1">
            Events & Guidance Camps
          </h2>
          <p className="text-xs text-[#62738D] mt-0.5">
            Organize, schedule, and track candidate guidance seminars, rural verification camps, and school outreach drives.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-white hover:bg-[#F4F7FB] text-[#102544] border border-[#DCE5F0] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#62738D]" />
            <span>Export Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#0866D9] hover:bg-[#073B70] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event / Camp</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#DCE5F0] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#62738D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search camp by title, location or audience..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-lg text-[#102544] placeholder:text-[#62738D] focus:border-[#0866D9] focus:bg-white outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#62738D]" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-white border border-[#DCE5F0] rounded-lg text-[#102544] outline-none"
            >
              <option value="All">All Event Types</option>
              <option value="Guidance Seminar">Guidance Seminar</option>
              <option value="Admission Camp">Admission Camp</option>
              <option value="Scrutiny Drive">Scrutiny Drive</option>
              <option value="School Outreach">School Outreach</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-white border border-[#DCE5F0] rounded-lg text-[#102544] outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-[#62738D]">
          Total Events: <strong>{filteredEvents.length}</strong>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvents.map((evt) => {
          const isCompleted = evt.status === 'Completed';
          const isActive = evt.status === 'Active';

          return (
            <div
              key={evt.id}
              className="bg-white border border-[#DCE5F0] hover:border-[#0866D9]/50 rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    evt.eventType === 'Guidance Seminar'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : evt.eventType === 'Admission Camp'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    {evt.eventType}
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isCompleted
                      ? 'bg-slate-100 text-slate-700'
                      : isActive
                      ? 'bg-emerald-50 text-[#079669] border border-emerald-200 animate-pulse'
                      : 'bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0]'
                  }`}>
                    {evt.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#102544] tracking-tight">
                  {evt.title}
                </h3>

                <div className="space-y-1.5 mt-3 text-xs text-[#62738D]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#0866D9] shrink-0" />
                    <span className="font-medium text-[#102544]">{evt.date} &bull; {evt.time}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#62738D] shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#62738D] shrink-0" />
                    <span>
                      Registered: <strong className="text-[#102544]">{evt.registeredAttendees}</strong> / {evt.expectedAttendees} Expected
                    </span>
                  </div>
                </div>

                {evt.notes && (
                  <p className="text-[11px] text-slate-600 bg-[#F4F7FB] p-2.5 rounded-lg border border-[#DCE5F0] mt-3 line-clamp-2">
                    {evt.notes}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-[#DCE5F0] flex items-center justify-between">
                <div className="text-[11px] text-[#62738D]">
                  Contact: <strong className="text-[#102544]">{evt.contactPerson}</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(evt)}
                    className="px-3 py-1.5 rounded-lg bg-[#F4F7FB] hover:bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0] text-xs font-semibold cursor-pointer"
                  >
                    View Details
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(evt.id, evt.title)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Remove event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Event Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#DCE5F0] p-6 max-w-lg w-full shadow-2xl text-[#102544] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0866D9]" />
                <h3 className="font-bold text-sm text-[#102544]">Create Guidance Camp / Outreach Event</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#102544] mb-1">
                  Camp / Event Title <span className="text-[#D92D3A]">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. MHT-CET Pre-CAP Options Guidance Seminar"
                  className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg focus:border-[#0866D9] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Event Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg bg-white outline-none"
                  >
                    <option value="Guidance Seminar">Guidance Seminar</option>
                    <option value="Admission Camp">Admission Camp</option>
                    <option value="Scrutiny Drive">Scrutiny Drive</option>
                    <option value="School Outreach">School Outreach</option>
                    <option value="Document Helpdesk">Document Helpdesk</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg bg-white outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Time Schedule</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="e.g. 10:30 AM – 1:30 PM"
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Expected Attendees</label>
                  <input
                    type="number"
                    value={newExpected}
                    onChange={(e) => setNewExpected(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#102544] mb-1">Location / Venue</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Washim District Auditorium / Karanja Tehsil Hall"
                  className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Coordinator Name</label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="e.g. P. D. Deshmukh"
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. +91 98220 12345"
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#102544] mb-1">Event Agenda / Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="Topics covered, documents needed, target schools..."
                  className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#DCE5F0] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0866D9] hover:bg-[#073B70] text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#DCE5F0] p-6 max-w-lg w-full shadow-2xl text-[#102544] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF3FC] text-[#0866D9]">
                  {selectedEvent.eventType}
                </span>
                <h3 className="font-bold text-sm text-[#102544] truncate">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Date & Time:</span>
                <span className="font-semibold text-[#102544]">{selectedEvent.date} ({selectedEvent.time})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Venue:</span>
                <span className="font-medium text-[#102544]">{selectedEvent.location}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Target Audience:</span>
                <span className="font-medium text-[#102544]">{selectedEvent.targetAudience}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Attendance:</span>
                <span className="font-bold text-[#0866D9]">{selectedEvent.registeredAttendees} / {selectedEvent.expectedAttendees}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Organizer:</span>
                <span className="text-[#102544]">{selectedEvent.organizer}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#62738D]">Helpline / Coordinator:</span>
                <span className="font-mono text-[#102544]">{selectedEvent.contactPerson} ({selectedEvent.contactPhone})</span>
              </div>
              {selectedEvent.notes && (
                <div className="pt-2 text-xs">
                  <span className="font-semibold text-[#102544] block mb-0.5">Camp Agenda:</span>
                  <p className="text-slate-600 bg-white p-2.5 rounded-lg border border-[#DCE5F0]">{selectedEvent.notes}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="w-full py-2.5 rounded-xl bg-[#073B70] text-white font-bold text-xs cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
