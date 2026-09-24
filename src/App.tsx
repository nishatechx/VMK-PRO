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
import { ImgToPdfModal } from './components/ImgToPdfModal';
import { ImageToTextModal } from './components/ImageToTextModal';
import { MobileQrUploadView } from './components/MobileQrUploadView';
import { ExternalWebsiteAssistantModal } from './components/ExternalWebsiteAssistantModal';
import { VaultFilePickerModal } from './components/VaultFilePickerModal';
import { LoginScreen } from './components/LoginScreen';
import { BroadcastComposerModal } from './components/BroadcastComposerModal';
import { BroadcastPopupModal } from './components/BroadcastPopupModal';
import { BroadcastNotification } from './types/broadcast';
import {
  getUnreadBroadcastsForUser,
  subscribeToBroadcasts,
  markBroadcastAsRead,
} from './services/broadcastService';
import {
  getCurrentUser,
  setCurrentUser,
  subscribeToUsers,
  syncUsersFromServer,
  DNO_USER,
  hasTabPermission,
  hasFeaturePermission,
} from './services/authService';
import { UserProfile } from './types/auth';
import { Building2, ShieldCheck, ExternalLink, Phone, Mail, MapPin, MessageCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getCurrentUser());

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const cur = getCurrentUser();
    if (cur && (cur.role === 'super_admin' || cur.username?.toLowerCase() === 'shrinath')) {
      return 'user_management';
    }
    return 'dashboard';
  });
  // Sidebar hidden by default per user requirement: "keep side bar hide by default"
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Modals for Core Functional Tools
  const [isTicketGeneratorOpen, setIsTicketGeneratorOpen] = useState<boolean>(false);
  const [isWhatsappTicketOpen, setIsWhatsappTicketOpen] = useState<boolean>(false);
  const [whatsappInitialData, setWhatsappInitialData] = useState<WhatsappInitialData | null>(null);
  const [isQrUploadModalOpen, setIsQrUploadModalOpen] = useState<boolean>(false);
  const [isImgToPdfOpen, setIsImgToPdfOpen] = useState<boolean>(false);
  const [isImageToTextOpen, setIsImageToTextOpen] = useState<boolean>(false);

  // Broadcast Notifications System
  const [isBroadcastComposerOpen, setIsBroadcastComposerOpen] = useState<boolean>(false);
  const [activeBroadcastPopup, setActiveBroadcastPopup] = useState<BroadcastNotification | null>(null);

  const handleAcknowledgeBroadcast = (broadcastId: string) => {
    if (currentUser) {
      markBroadcastAsRead(broadcastId, currentUser.id || currentUser.username);
      const remaining = getUnreadBroadcastsForUser(currentUser);
      if (remaining.length > 0) {
        setActiveBroadcastPopup(remaining[0]);
      } else {
        setActiveBroadcastPopup(null);
      }
    } else {
      setActiveBroadcastPopup(null);
    }
  };

  // Monitor unread broadcasts for logged-in counsellors & supporting staff
  useEffect(() => {
    if (!currentUser) {
      setActiveBroadcastPopup(null);
      return;
    }

    // Check upon login / user change
    const initialUnread = getUnreadBroadcastsForUser(currentUser);
    if (initialUnread.length > 0) {
      setActiveBroadcastPopup(initialUnread[0]);
    }

    // Real-time listener for incoming broadcasts
    const unsubscribe = subscribeToBroadcasts(() => {
      const freshUnread = getUnreadBroadcastsForUser(currentUser);
      if (freshUnread.length > 0) {
        setActiveBroadcastPopup((prev) => prev || freshUnread[0]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleOpenWhatsappWithData = (data: WhatsappInitialData) => {
    if (hasFeaturePermission(currentUser, 'whatsapp_tool')) {
      // Per instruction: Ticket ID is not prefilled; must be added by user
      setWhatsappInitialData({ ...data, ticketNo: '' });
      setIsTicketGeneratorOpen(false);
      setTicketInitialCandidate(null);
      setIsWhatsappTicketOpen(true);
    }
  };

  const handleSyncWhatsappData = (data: WhatsappInitialData) => {
    // Automatically syncs ticket data to the WhatsApp tool in the background without popping it up
    // Per instruction: Ticket ID is not prefilled; must be added by user
    setWhatsappInitialData({ ...data, ticketNo: '' });
  };

  const handleOpenWhatsappGeneral = () => {
    if (hasFeaturePermission(currentUser, 'whatsapp_tool')) {
      // Opens WhatsApp tool with any pre-synced data available
      setIsWhatsappTicketOpen(true);
    }
  };

  const [ticketInitialCandidate, setTicketInitialCandidate] = useState<any | null>(null);

  const handleOpenTicketGenerator = () => {
    if (hasFeaturePermission(currentUser, 'ticket_generator_tool')) {
      setIsTicketGeneratorOpen(true);
    }
  };

  const handleOpenTicketWithData = (candidateData: any) => {
    if (hasFeaturePermission(currentUser, 'ticket_generator_tool')) {
      setTicketInitialCandidate({ ...candidateData, _t: Date.now() });
      setIsImageToTextOpen(false);
      setIsTicketGeneratorOpen(true);
    }
  };

  const handleOpenQrUpload = () => {
    if (hasFeaturePermission(currentUser, 'qr_upload_tool')) {
      setIsQrUploadModalOpen(true);
    }
  };

  const handleOpenImgToPdf = () => {
    if (hasFeaturePermission(currentUser, 'img_to_pdf_tool')) {
      setIsImgToPdfOpen(true);
    }
  };

  const [imageToTextInitialImage, setImageToTextInitialImage] = useState<string | null>(null);

  const handleOpenImageToText = () => {
    if (hasFeaturePermission(currentUser, 'image_to_text_tool')) {
      setImageToTextInitialImage(null);
      setIsImageToTextOpen(true);
    }
  };

  const handleOpenImageToTextWithImage = (imageFileOrUrl?: string | any) => {
    if (hasFeaturePermission(currentUser, 'image_to_text_tool')) {
      if (typeof imageFileOrUrl === 'string') {
        setImageToTextInitialImage(imageFileOrUrl);
      } else if (imageFileOrUrl && typeof imageFileOrUrl === 'object' && 'dataUrl' in imageFileOrUrl) {
        setImageToTextInitialImage(imageFileOrUrl.dataUrl);
      } else {
        setImageToTextInitialImage(null);
      }
      setIsImageToTextOpen(true);
    }
  };

  const [qrSessionParam, setQrSessionParam] = useState<string | null>(null);
  const [isExternalAssistantOpen, setIsExternalAssistantOpen] = useState<boolean>(false);
  const [vaultPickerParam, setVaultPickerParam] = useState<boolean>(false);
  const [vaultPickerAccept, setVaultPickerAccept] = useState<string[]>(['.pdf', '.jpg', '.jpeg', '.png']);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurUser(user);
    setIsAuthenticated(true);
    if (user.role === 'super_admin' || user.username?.toLowerCase() === 'shrinath') {
      setActiveTab('user_management');
      return;
    }
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
      const isSuperAdmin = updated.role === 'super_admin' || updated.username?.toLowerCase() === 'shrinath';
      if (isSuperAdmin) {
        if (activeTab !== 'user_management' && activeTab !== 'profile') {
          setActiveTab('user_management');
        }
        return;
      }
      if (!hasTabPermission(updated, activeTab)) {
        const priorityOrder: NavTab[] = [
          'dashboard',
          'students',
          'tickets',
          'visitors',
          'profile',
          'settings',
          'google_sheets',
          'user_management',
        ];
        const firstAllowed = priorityOrder.find((t) => hasTabPermission(updated, t));
        setActiveTab(firstAllowed || 'profile');
      }
    }
  };

  // Keep active tab strictly within user's authorized permissions
  useEffect(() => {
    if (currentUser) {
      const isSuperAdmin = currentUser.role === 'super_admin' || currentUser.username?.toLowerCase() === 'shrinath';
      if (isSuperAdmin) {
        if (activeTab !== 'user_management' && activeTab !== 'profile') {
          setActiveTab('user_management');
        }
        return;
      }
      if (!hasTabPermission(currentUser, activeTab)) {
        const priorityOrder: NavTab[] = [
          'dashboard',
          'students',
          'tickets',
          'visitors',
          'profile',
          'settings',
          'google_sheets',
          'user_management',
        ];
        const firstAllowed = priorityOrder.find((t) => hasTabPermission(currentUser, t));
        if (firstAllowed && firstAllowed !== activeTab) {
          setActiveTab(firstAllowed);
        }
      }
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const session = params.get('qrSession');
      if (session) {
        setQrSessionParam(session);
      }
      const isPicker = params.get('vaultPicker');
      if (isPicker === 'true' || isPicker === '1') {
        setVaultPickerParam(true);
        const accept = params.get('accept');
        if (accept) {
          const parts = accept.split(',').map((p) => p.trim().toLowerCase());
          if (parts.length > 0) {
            setVaultPickerAccept(parts);
          }
        }
      }
    }

    syncUsersFromServer().catch(() => {});

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

  // Handle Standalone Vault Picker Window (e.g., opened via target website companion button or popup)
  if (vaultPickerParam) {
    return (
      <div className="fixed inset-0 bg-[#003B73]/20 backdrop-blur-xs flex items-center justify-center p-4">
        <VaultFilePickerModal
          isOpen={true}
          isStandalone={true}
          onClose={() => {
            if (typeof window !== 'undefined') {
              if (window.opener) {
                window.close();
              } else {
                window.history.pushState({}, '', window.location.pathname);
                setVaultPickerParam(false);
              }
            }
          }}
          acceptedFormats={vaultPickerAccept}
        />
      </div>
    );
  }

  // Not logged in -> Show Login View
  if (!isAuthenticated || !currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const navigateToTab = (tab: NavTab) => {
    if (hasTabPermission(currentUser, tab)) {
      setActiveTab(tab);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    }
  };

  return (
    <div
      id="vmk-washim-app-root"
      className="flex h-screen w-full bg-[#F7F9FC] text-[#4B5563] font-sans select-none overflow-hidden"
    >
      {/* Left Sidebar (Desktop Docked when open - Hidden by default) */}
      {isSidebarOpen && (
        <div
          className={`hidden md:flex h-full shrink-0 transition-all duration-300 z-20`}
        >
          <Sidebar
            activeTab={activeTab}
            onSelectTab={navigateToTab}
            onLogout={handleLogout}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onClose={() => setIsSidebarOpen(false)}
            currentUser={currentUser}
            onOpenWhatsappTool={handleOpenWhatsappGeneral}
            onOpenQrTool={handleOpenQrUpload}
            onOpenTicketTool={handleOpenTicketGenerator}
            onOpenImgToPdfTool={handleOpenImgToPdf}
            onOpenImageToTextTool={handleOpenImageToText}
            onOpenExternalPortal={() => setIsExternalAssistantOpen(true)}
          />
        </div>
      )}

      {/* Mobile Drawer Overlay (Hidden by default) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-[#003B73]/60 backdrop-blur-xs"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative w-72 h-full bg-[#F7F9FC] z-10 shadow-2xl">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={(tab) => {
                navigateToTab(tab);
                setIsSidebarOpen(false);
              }}
              onLogout={handleLogout}
              isCollapsed={false}
              onToggleCollapse={() => setIsSidebarOpen(false)}
              onClose={() => setIsSidebarOpen(false)}
              currentUser={currentUser}
              onOpenWhatsappTool={handleOpenWhatsappGeneral}
              onOpenQrTool={handleOpenQrUpload}
              onOpenTicketTool={handleOpenTicketGenerator}
              onOpenImgToPdfTool={handleOpenImgToPdf}
              onOpenImageToTextTool={handleOpenImageToText}
              onOpenExternalPortal={() => setIsExternalAssistantOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Main Right Area: Top Navbar + Large Rounded Content Card with Background Artwork */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigateTab={navigateToTab}
          onLogout={handleLogout}
          onOpenImgToPdf={hasFeaturePermission(currentUser, 'img_to_pdf_tool') ? handleOpenImgToPdf : undefined}
          onOpenImageToText={hasFeaturePermission(currentUser, 'image_to_text_tool') ? handleOpenImageToText : undefined}
          onOpenExternalPortal={() => setIsExternalAssistantOpen(true)}
          onOpenBroadcastModal={() => setIsBroadcastComposerOpen(true)}
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
                  onOpenQrTool={handleOpenQrUpload}
                  onOpenTicketTool={handleOpenTicketGenerator}
                  onOpenTicketWithData={handleOpenTicketWithData}
                  onOpenImgToPdfTool={handleOpenImgToPdf}
                  onOpenImageToTextTool={handleOpenImageToText}
                  onOpenExternalPortal={() => setIsExternalAssistantOpen(true)}
                  onOpenBroadcastModal={() => setIsBroadcastComposerOpen(true)}
                  onNavigateTab={navigateToTab}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'visitors' && hasTabPermission(currentUser, 'visitors') && (
                <VisitorsView
                  currentUser={currentUser}
                  onNavigateTab={(tab) => navigateToTab(tab as NavTab)}
                />
              )}

              {activeTab === 'tickets' && hasTabPermission(currentUser, 'tickets') && (
                <TicketsView
                  currentUser={currentUser}
                  onOpenTicketTool={handleOpenTicketGenerator}
                  onOpenTicketWithData={handleOpenTicketWithData}
                  onOpenWhatsappTool={handleOpenWhatsappGeneral}
                  onOpenWhatsappWithData={handleOpenWhatsappWithData}
                  onOpenExternalPortal={() => setIsExternalAssistantOpen(true)}
                />
              )}

              {activeTab === 'google_sheets' && hasTabPermission(currentUser, 'google_sheets') && (
                <GoogleSheetsView currentUser={currentUser} />
              )}

              {activeTab === 'students' && hasTabPermission(currentUser, 'students') && (
                <StudentsView
                  onOpenWhatsappTool={handleOpenWhatsappGeneral}
                  onOpenTicketTool={handleOpenTicketGenerator}
                  onOpenQrTool={handleOpenQrUpload}
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

              {!hasTabPermission(currentUser, activeTab) && (
                <div className="bg-white border border-[#D9E1EA] rounded-2xl p-8 text-center max-w-md mx-auto my-12 shadow-xs">
                  <ShieldCheck className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-[#003B73] mb-1">Access Restricted</h3>
                  <p className="text-xs text-[#6B7280] mb-4">
                    You are not authorized to view this tab. Please select an authorized option from the navigation menu.
                  </p>
                </div>
              )}
            </div>

            {/* Application Footer */}
            <footer className="relative z-10 w-full max-w-6xl mx-auto mt-8 pt-6 border-t border-[#D9E1EA] text-xs text-[#6B7280]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[11px] text-[#4B5563]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Facilitation & Admission Portal</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                  <span>Scrutiny & Verification Desk</span>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* 3 Core Interactive Modals */}
      <WhatsappTicketModal
        isOpen={isWhatsappTicketOpen}
        onClose={() => setIsWhatsappTicketOpen(false)}
        currentUser={currentUser}
        initialTicketData={whatsappInitialData}
      />

      <QrUploadModal
        isOpen={isQrUploadModalOpen}
        onClose={() => setIsQrUploadModalOpen(false)}
        currentUser={currentUser}
        onOpenImgToPdf={hasFeaturePermission(currentUser, 'img_to_pdf_tool') ? handleOpenImgToPdf : undefined}
        onOpenImageToText={hasFeaturePermission(currentUser, 'image_to_text_tool') ? handleOpenImageToTextWithImage : undefined}
      />

      <TicketGeneratorModal
        isOpen={isTicketGeneratorOpen}
        onClose={() => {
          setIsTicketGeneratorOpen(false);
          setTicketInitialCandidate(null);
        }}
        initialCandidate={ticketInitialCandidate}
        currentUser={currentUser}
        onOpenWhatsappWithData={handleOpenWhatsappWithData}
        onSyncWhatsappData={handleSyncWhatsappData}
      />

      <ImgToPdfModal
        isOpen={isImgToPdfOpen}
        onClose={() => setIsImgToPdfOpen(false)}
        currentUser={currentUser}
      />

      <ImageToTextModal
        isOpen={isImageToTextOpen}
        onClose={() => {
          setIsImageToTextOpen(false);
          setImageToTextInitialImage(null);
        }}
        initialImage={imageToTextInitialImage}
        currentUser={currentUser}
        onSendToTicketGenerator={handleOpenTicketWithData}
      />

      {/* External Target Website (MHCET Tickets) Vault Integration Assistant & Simulator */}
      <ExternalWebsiteAssistantModal
        isOpen={isExternalAssistantOpen}
        onClose={() => setIsExternalAssistantOpen(false)}
      />

      {/* Broadcast Notification Popup for Counsellors & Supporting Staff upon Login */}
      <BroadcastPopupModal
        isOpen={!!activeBroadcastPopup}
        broadcast={activeBroadcastPopup}
        onAcknowledge={handleAcknowledgeBroadcast}
        onClose={() => setActiveBroadcastPopup(null)}
      />

      {/* Broadcast Composer Modal for Super Admin & DNO */}
      <BroadcastComposerModal
        isOpen={isBroadcastComposerOpen}
        onClose={() => setIsBroadcastComposerOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
