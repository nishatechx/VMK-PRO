import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { DashboardBackgroundSvg } from './components/DashboardBackgroundSvg';
import { DashboardView } from './components/views/DashboardView';
import { VisitorsView } from './components/views/VisitorsView';
import { StudentsView } from './components/views/StudentsView';
import { SettingsView } from './components/views/SettingsView';
import { ProfileView } from './components/views/ProfileView';
import { UserManagementView } from './components/views/UserManagementView';
import { GoogleSheetsView } from './components/views/GoogleSheetsView';
import { TicketsView } from './components/views/TicketsView';

import { TicketGeneratorModal } from './components/TicketGeneratorModal';
import { WhatsappTicketModal, WhatsappInitialData } from './components/WhatsappTicketModal';
import { QrUploadModal } from './components/QrUploadModal';
import { MobileQrUploadView } from './components/MobileQrUploadView';
import { LoginScreen } from './components/LoginScreen';
import {
  getCurrentUser,
  setCurrentUser,
  subscribeToUsers,
  DNO_USER,
  hasTabPermission,
  hasFeaturePermission,
} from './services/authService';
import { UserProfile } from './types/auth';
import { Building2, ShieldCheck, ExternalLink, Phone, Mail, MapPin } from 'lucide-react';

export default function App() {
  const [currentUser, setCurUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getCurrentUser());

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Modals for the 3 Core Functional Tools
  const [isTicketGeneratorOpen, setIsTicketGeneratorOpen] = useState<boolean>(false);
  const [isWhatsappTicketOpen, setIsWhatsappTicketOpen] = useState<boolean>(false);
  const [whatsappInitialData, setWhatsappInitialData] = useState<WhatsappInitialData | null>(null);
  const [isQrUploadModalOpen, setIsQrUploadModalOpen] = useState<boolean>(false);

  const handleOpenWhatsappWithData = (data: WhatsappInitialData) => {
    setWhatsappInitialData(data);
    setIsWhatsappTicketOpen(true);
  };

  const handleOpenWhatsappGeneral = () => {
    setWhatsappInitialData(null);
    setIsWhatsappTicketOpen(true);
  };

  const [qrSessionParam, setQrSessionParam] = useState<string | null>(null);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurUser(user);
    setIsAuthenticated(true);
    // If user's default active tab is not in allowed tabs, switch to first allowed
    if (!hasTabPermission(user, activeTab)) {
      const firstAllowed = (['dashboard', 'tickets', 'visitors', 'students', 'google_sheets', 'settings', 'profile', 'user_management'] as NavTab[]).find(
        (t) => hasTabPermission(user, t)
      );
      setActiveTab(firstAllowed || 'profile');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurUser(null);
    setIsAuthenticated(false);
  };

  const handleRefreshSession = () => {
    const updated = getCurrentUser();
    if (updated) {
      setCurUser(updated);
      if (!hasTabPermission(updated, activeTab)) {
        const firstAllowed = (['dashboard', 'tickets', 'visitors', 'students', 'google_sheets', 'settings', 'profile', 'user_management'] as NavTab[]).find(
          (t) => hasTabPermission(updated, t)
        );
        setActiveTab(firstAllowed || 'profile');
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const session = params.get('qrSession');
      if (session) {
        setQrSessionParam(session);
      }
    }

    // Subscribe to live user updates to keep avatar & profile synced
    const unsubscribe = subscribeToUsers((users) => {
      const cur = getCurrentUser();
      if (cur) {
        const fresh = users.find(
          (u) => u.id === cur.id || u.username.toLowerCase() === cur.username.toLowerCase()
        );
        if (fresh) {
          setCurUser(fresh);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Mobile QR scanning view if session exists in URL
  if (qrSessionParam) {
    return (
      <MobileQrUploadView
        sessionId={qrSessionParam}
        onBackToMain={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', window.location.pathname);
            setQrSessionParam(null);
          }
        }}
      />
    );
  }

  // Not logged in -> Show Login View
  if (!isAuthenticated || !currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      id="vmk-washim-app-root"
      className="flex h-screen w-full bg-[#F7F9FC] text-[#4B5563] font-sans select-none overflow-hidden"
    >
      {/* Left Sidebar (Desktop & Mobile drawer) */}
      <div
        className={`hidden md:flex h-full shrink-0 transition-all duration-300 z-20`}
      >
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          currentUser={currentUser}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-[#003B73]/60 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-72 h-full bg-[#F7F9FC] z-10 shadow-2xl">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              onLogout={handleLogout}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileSidebarOpen(false)}
              currentUser={currentUser}
            />
          </div>
        </div>
      )}

      {/* Main Right Area: Top Navbar + Large Rounded Content Card with Background Artwork */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar
          onToggleSidebar={() => {
            if (window.innerWidth < 768) {
              setIsMobileSidebarOpen(!isMobileSidebarOpen);
            } else {
              setIsSidebarCollapsed(!isSidebarCollapsed);
            }
          }}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onLogout={handleLogout}
          currentUser={currentUser}
        />

        {/* Main Content Rounded Card Viewport */}
        <main className="flex-1 px-3 sm:px-6 pb-4 sm:pb-6 min-h-0 overflow-hidden">
          <div
            id="main-stage-container"
            className="relative w-full h-full bg-[#FFFFFF] rounded-2xl md:rounded-3xl border border-[#D9E1EA] shadow-sm overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between"
          >
            {/* Vector Wavy Background + Top Right Dots matching screenshot */}
            <DashboardBackgroundSvg />

            {/* Interactive View Content */}
            <div className="relative z-10 w-full max-w-6xl mx-auto flex-1">
              {activeTab === 'dashboard' && hasTabPermission(currentUser, 'dashboard') && (
                <DashboardView
                  onOpenWhatsappTool={handleOpenWhatsappGeneral}
                  onOpenQrTool={() => setIsQrUploadModalOpen(true)}
                  onOpenTicketTool={() => setIsTicketGeneratorOpen(true)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'visitors' && hasTabPermission(currentUser, 'visitors') && (
                <VisitorsView
                  currentUser={currentUser}
                  onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
                />
              )}

              {activeTab === 'tickets' && hasTabPermission(currentUser, 'tickets') && (
                <TicketsView
                  currentUser={currentUser}
                  onOpenTicketTool={() => setIsTicketGeneratorOpen(true)}
                  onOpenWhatsappTool={handleOpenWhatsappGeneral}
                  onOpenWhatsappWithData={handleOpenWhatsappWithData}
                />
              )}

              {activeTab === 'google_sheets' && hasTabPermission(currentUser, 'google_sheets') && (
                <GoogleSheetsView currentUser={currentUser} />
              )}

              {activeTab === 'students' && hasTabPermission(currentUser, 'students') && (
                <StudentsView
                  onOpenWhatsappTool={handleOpenWhatsappGeneral}
                  onOpenTicketTool={() => setIsTicketGeneratorOpen(true)}
                  onOpenQrTool={() => setIsQrUploadModalOpen(true)}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'settings' && hasTabPermission(currentUser, 'settings') && (
                <SettingsView
                  currentUser={currentUser}
                  onNavigateToUsers={() => setActiveTab('user_management')}
                />
              )}

              {activeTab === 'profile' && hasTabPermission(currentUser, 'profile') && (
                <ProfileView
                  onLogout={handleLogout}
                  currentUser={currentUser}
                  onRefreshSession={handleRefreshSession}
                />
              )}

              {activeTab === 'user_management' && hasTabPermission(currentUser, 'user_management') && (
                <UserManagementView
                  currentUser={currentUser}
                  onRefreshSession={handleRefreshSession}
                />
              )}
            </div>

            {/* Application Footer */}
            <footer className="relative z-10 w-full max-w-6xl mx-auto mt-8 pt-6 border-t border-[#D9E1EA] text-xs text-[#6B7280]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[11px] text-[#4B5563]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Secure Verification & Visitor Management Portal</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                  <span>Candidate Scrutiny System</span>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* 3 Core Interactive Modals */}
      <WhatsappTicketModal
        isOpen={isWhatsappTicketOpen}
        onClose={() => {
          setIsWhatsappTicketOpen(false);
          setWhatsappInitialData(null);
        }}
        currentUser={currentUser}
        initialTicketData={whatsappInitialData}
      />

      <QrUploadModal
        isOpen={isQrUploadModalOpen}
        onClose={() => setIsQrUploadModalOpen(false)}
      />

      <TicketGeneratorModal
        isOpen={isTicketGeneratorOpen}
        onClose={() => setIsTicketGeneratorOpen(false)}
        currentUser={currentUser}
        onOpenWhatsappWithData={handleOpenWhatsappWithData}
      />
    </div>
  );
}
