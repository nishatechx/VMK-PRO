import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { DashboardView } from './components/views/DashboardView';
import { FacilitationToolsView } from './components/views/FacilitationToolsView';
import { CandidatesView } from './components/views/CandidatesView';
import { TicketsView } from './components/views/TicketsView';
import { ReportsView } from './components/views/ReportsView';
import { NoticesCircularsView } from './components/views/NoticesCircularsView';
import { KnowledgeBaseView } from './components/views/KnowledgeBaseView';
import { SettingsView } from './components/views/SettingsView';
import { VisitorsView } from './components/views/VisitorsView';
import { ProfileView } from './components/views/ProfileView';
import { UserManagementView } from './components/views/UserManagementView';
import { GoogleSheetsView } from './components/views/GoogleSheetsView';

import { DailyMotivationalPosterModal } from './components/DailyMotivationalPosterModal';
import { checkAndPrepareDailyQuote, getKolkataDateString } from './services/motivationalQuoteService';
import { MotivationalQuote } from './types/motivationalQuote';

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
import { KnowledgeCenterModal } from './components/KnowledgeCenterModal';
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
  refreshUserPermissionsFromBackend,
  hasTabPermission,
  hasFeaturePermission,
} from './services/authService';
import { UserProfile } from './types/auth';
import { ShieldCheck, ExternalLink, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { OfflineSyncStatusBanner } from './components/OfflineSyncStatusBanner';
import { registerServiceWorkerAndSync } from './services/backgroundSyncProcessor';

export default function App() {
  const [currentUser, setCurUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getCurrentUser());

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const cur = getCurrentUser();
    if (cur && (cur.role === 'super_admin' || cur.username?.toLowerCase() === 'shrinath')) {
      return 'dashboard';
    }
    return 'dashboard';
  });

  // Sidebar hidden by default per user preference
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Modals for Core Functional Tools
  const [isTicketGeneratorOpen, setIsTicketGeneratorOpen] = useState<boolean>(false);
  const [isWhatsappTicketOpen, setIsWhatsappTicketOpen] = useState<boolean>(false);
  const [whatsappInitialData, setWhatsappInitialData] = useState<WhatsappInitialData | null>(null);
  const [isQrUploadModalOpen, setIsQrUploadModalOpen] = useState<boolean>(false);
  const [isImgToPdfOpen, setIsImgToPdfOpen] = useState<boolean>(false);
  const [isImageToTextOpen, setIsImageToTextOpen] = useState<boolean>(false);
  const [isKnowledgeCenterOpen, setIsKnowledgeCenterOpen] = useState<boolean>(false);

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

    const initialUnread = getUnreadBroadcastsForUser(currentUser);
    if (initialUnread.length > 0) {
      setActiveBroadcastPopup(initialUnread[0]);
    }

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
      setWhatsappInitialData({ ...data, ticketNo: '' });
      setIsTicketGeneratorOpen(false);
      setTicketInitialCandidate(null);
      setIsWhatsappTicketOpen(true);
    }
  };

  const handleSyncWhatsappData = (data: WhatsappInitialData) => {
    setWhatsappInitialData({ ...data, ticketNo: '' });
  };

  const handleOpenWhatsappGeneral = () => {
    if (hasFeaturePermission(currentUser, 'whatsapp_tool')) {
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

  const handleOpenKnowledgeCenter = () => {
    setIsKnowledgeCenterOpen(true);
  };

  const [qrSessionParam, setQrSessionParam] = useState<string | null>(null);
  const [isExternalAssistantOpen, setIsExternalAssistantOpen] = useState<boolean>(false);
  const [vaultPickerParam, setVaultPickerParam] = useState<boolean>(false);
  const [vaultPickerAccept, setVaultPickerAccept] = useState<string[]>(['.pdf', '.jpg', '.jpeg', '.png']);

  // Daily Motivational Quote Poster Modal state
  const [dailyQuote, setDailyQuote] = useState<MotivationalQuote | null>(null);
  const [isDailyQuoteOpen, setIsDailyQuoteOpen] = useState<boolean>(false);
  const hasCheckedDailyQuoteRef = useRef<boolean>(false);

  const triggerDailyQuoteForUser = async (user: UserProfile) => {
    try {
      const quote = await checkAndPrepareDailyQuote(user);
      if (quote) {
        setDailyQuote(quote);
        setIsDailyQuoteOpen(true);
      }
    } catch (err) {
      console.warn('[App] Daily quote check warning:', err);
    }
  };

  useEffect(() => {
    if (currentUser && !hasCheckedDailyQuoteRef.current) {
      hasCheckedDailyQuoteRef.current = true;
      triggerDailyQuoteForUser(currentUser);
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurUser(user);
    setIsAuthenticated(true);
    hasCheckedDailyQuoteRef.current = true;
    triggerDailyQuoteForUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurUser(null);
    setIsAuthenticated(false);
    hasCheckedDailyQuoteRef.current = false;
    setIsDailyQuoteOpen(false);
    setDailyQuote(null);
  };

  const handleRefreshSession = () => {
    const updated = getCurrentUser();
    if (updated) {
      setCurUser(updated);
    }
  };

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
    registerServiceWorkerAndSync();

    // Check backend permissions for currently authenticated user immediately on session restore
    const cur = getCurrentUser();
    if (cur) {
      refreshUserPermissionsFromBackend(cur).then((refreshed) => {
        if (refreshed) {
          setCurUser(refreshed);
        }
      });
    }

    const unsubscribe = subscribeToUsers((users) => {
      const activeUser = getCurrentUser();
      if (activeUser) {
        const fresh = users.find(
          (u) => u.id === activeUser.id || u.username.toLowerCase() === activeUser.username.toLowerCase()
        );
        if (fresh) {
          const curVer = activeUser.permissionVersion || 0;
          const freshVer = fresh.permissionVersion || 0;
          if (
            freshVer > curVer ||
            JSON.stringify(fresh.allowedTabs) !== JSON.stringify(activeUser.allowedTabs) ||
            JSON.stringify(fresh.allowedFeatures) !== JSON.stringify(activeUser.allowedFeatures) ||
            fresh.isActive !== activeUser.isActive
          ) {
            setCurrentUser(fresh);
            setCurUser(fresh);
          }
        }
      }
    });

    const handleWindowActive = () => {
      const activeUser = getCurrentUser();
      if (activeUser) {
        refreshUserPermissionsFromBackend(activeUser).then((refreshed) => {
          if (refreshed) {
            setCurUser(refreshed);
          }
        });
      }
      syncUsersFromServer().catch(() => {});
    };

    window.addEventListener('focus', handleWindowActive);
    window.addEventListener('online', handleWindowActive);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleWindowActive();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const syncInterval = setInterval(() => {
      syncUsersFromServer().catch(() => {});
      const activeUser = getCurrentUser();
      if (activeUser) {
        refreshUserPermissionsFromBackend(activeUser).catch(() => {});
      }
    }, 12000);

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleWindowActive);
      window.removeEventListener('online', handleWindowActive);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Enforce tab permissions: if active tab is revoked, automatically redirect to permitted dashboard
  useEffect(() => {
    if (currentUser && !hasTabPermission(currentUser, activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab]);

  // Handle Mobile QR scanning view
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

  // Handle Standalone Vault Picker Window
  if (vaultPickerParam) {
    return (
      <div className="fixed inset-0 bg-[#073B70]/30 backdrop-blur-xs flex items-center justify-center p-4">
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
    // If deprecated tab, redirect to dashboard
    if ((tab as string) === 'events_camps' || (tab as string) === 'counsellor_tools') {
      setActiveTab('dashboard');
      return;
    }

    // Check if the user is authorized to access the requested tab
    if (currentUser && !hasTabPermission(currentUser, tab)) {
      setActiveTab('dashboard');
      return;
    }

    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div
      id="vmk-washim-app-root"
      className="flex h-screen w-full bg-[#F4F7FB] text-[#102544] font-sans select-none overflow-hidden"
    >
      {/* 1. LEFT DARK NAVY SIDEBAR (~220px desktop width per Section 3) */}
      {isSidebarOpen && (
        <div className="hidden lg:flex h-full shrink-0 transition-all duration-300 z-30">
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
            onOpenKnowledgeCenter={handleOpenKnowledgeCenter}
          />
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-2xs"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative w-64 h-full bg-[#092744] z-10 shadow-2xl">
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
              onOpenKnowledgeCenter={handleOpenKnowledgeCenter}
            />
          </div>
        </div>
      )}

      {/* 1.5. CENTER-LEFT SIDEBAR OPEN / HIDE TOGGLE TAB */}
      <button
        type="button"
        id="center-left-sidebar-toggle-btn"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-40 flex items-center justify-center transition-all duration-300 cursor-pointer shadow-md hover:shadow-xl active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#0866D9] ${
          isSidebarOpen
            ? `${
                isSidebarCollapsed ? 'lg:left-16' : 'lg:left-[220px]'
              } max-lg:left-64 -ml-3 w-6.5 h-12 bg-[#092744] hover:bg-[#073B70] text-slate-200 hover:text-white rounded-r-lg border-y border-r border-[#0d345a]`
            : 'left-0 w-7 h-14 bg-[#073B70] hover:bg-[#0866D9] text-white rounded-r-xl shadow-lg border-y border-r border-sky-400/40 hover:w-8.5'
        }`}
        title={isSidebarOpen ? 'Hide Sidebar (Full Viewport)' : 'Open Sidebar'}
        aria-label={isSidebarOpen ? 'Hide Sidebar' : 'Open Sidebar'}
      >
        {isSidebarOpen ? (
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        ) : (
          <ChevronRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-0.5" />
        )}
      </button>

      {/* 2. MAIN RIGHT WORKSPACE: HEADER (~74px) + VIEWPORT */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-[#F4F7FB]">
        {/* Top Header (~74px desktop height per Section 3) */}
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

        {/* Real-time Network & Background Sync Alert Banner */}
        <OfflineSyncStatusBanner />

        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-7 py-5 min-h-0 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto min-h-full flex flex-col justify-between">
            {/* 10 ENTERPRISE DESTINATIONS ROUTING */}
            <div className="flex-1">
              {/* TAB 1: Dashboard */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  onOpenWhatsappTool={handleOpenWhatsappGeneral}
                  onOpenQrTool={handleOpenQrUpload}
                  onOpenTicketTool={handleOpenTicketGenerator}
                  onOpenTicketWithData={handleOpenTicketWithData}
                  onOpenImgToPdfTool={handleOpenImgToPdf}
                  onOpenImageToTextTool={handleOpenImageToText}
                  onOpenExternalPortal={() => setIsExternalAssistantOpen(true)}
                  onOpenBroadcastModal={() => setIsBroadcastComposerOpen(true)}
                  onOpenKnowledgeCenter={handleOpenKnowledgeCenter}
                  onNavigateTab={navigateToTab}
                  currentUser={currentUser}
                />
              )}

              {/* TAB 2: Facilitation Tools */}
              {activeTab === 'facilitation_tools' && (
                <FacilitationToolsView
                  onOpenWhatsappTool={handleOpenWhatsappGeneral}
                  onOpenQrTool={handleOpenQrUpload}
                  onOpenTicketTool={handleOpenTicketGenerator}
                  onOpenImgToPdfTool={handleOpenImgToPdf}
                  onOpenImageToTextTool={handleOpenImageToText}
                  onOpenKnowledgeCenter={handleOpenKnowledgeCenter}
                  currentUser={currentUser}
                />
              )}

              {/* TAB 3: Candidates (and students alias) */}
              {(activeTab === 'candidates' || activeTab === 'students') && (
                <CandidatesView
                  onOpenWhatsappTool={handleOpenWhatsappGeneral}
                  onOpenTicketTool={handleOpenTicketGenerator}
                  onOpenQrTool={handleOpenQrUpload}
                  currentUser={currentUser}
                />
              )}

              {/* TAB 4: Tickets */}
              {activeTab === 'tickets' && (
                <TicketsView
                  currentUser={currentUser}
                  onOpenTicketTool={handleOpenTicketGenerator}
                  onOpenTicketWithData={handleOpenTicketWithData}
                  onOpenWhatsappTool={handleOpenWhatsappGeneral}
                  onOpenWhatsappWithData={handleOpenWhatsappWithData}
                  onOpenExternalPortal={() => setIsExternalAssistantOpen(true)}
                />
              )}

              {/* Reports */}
              {activeTab === 'reports' && (
                <ReportsView currentUser={currentUser} />
              )}

              {/* TAB 8: Notices & Circulars */}
              {activeTab === 'notices_circulars' && (
                <NoticesCircularsView />
              )}

              {/* TAB 9: Knowledge Base */}
              {activeTab === 'knowledge_base' && (
                <KnowledgeBaseView onOpenKnowledgeCenter={handleOpenKnowledgeCenter} />
              )}

              {/* TAB 10: Settings */}
              {activeTab === 'settings' && (
                <SettingsView
                  currentUser={currentUser}
                  onNavigateToUsers={() => setActiveTab('user_management')}
                  onRefreshSession={handleRefreshSession}
                />
              )}

              {/* Auxiliary Sub-Views */}
              {activeTab === 'visitors' && (
                <VisitorsView
                  currentUser={currentUser}
                  onNavigateTab={(tab) => navigateToTab(tab as NavTab)}
                />
              )}

              {activeTab === 'google_sheets' && (
                <GoogleSheetsView currentUser={currentUser} />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  onLogout={handleLogout}
                  currentUser={currentUser}
                  onRefreshSession={handleRefreshSession}
                />
              )}

              {activeTab === 'user_management' && (
                <UserManagementView
                  currentUser={currentUser}
                  onRefreshSession={handleRefreshSession}
                />
              )}
            </div>

            {/* Enterprise Institutional Footer */}
            <footer className="w-full mt-8 pt-5 border-t border-[#DCE5F0] text-xs text-[#62738D]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] text-[#102544] font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#079669]" />
                  <span>FC-1102 Facilitation & Scrutiny Center &bull; Govt. of Maharashtra</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[#62738D]">
                  <span>Operational Status: All Desks Active</span>
                  <span>&bull;</span>
                  <span>Washim District Nodal Supervision</span>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* Core Operational Modals */}
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

      <ExternalWebsiteAssistantModal
        isOpen={isExternalAssistantOpen}
        onClose={() => setIsExternalAssistantOpen(false)}
      />

      <BroadcastPopupModal
        isOpen={!!activeBroadcastPopup}
        broadcast={activeBroadcastPopup}
        onAcknowledge={handleAcknowledgeBroadcast}
        onClose={() => setActiveBroadcastPopup(null)}
      />

      {isBroadcastComposerOpen && (
        <BroadcastComposerModal
          isOpen={isBroadcastComposerOpen}
          onClose={() => setIsBroadcastComposerOpen(false)}
          currentUser={currentUser}
        />
      )}

      <KnowledgeCenterModal
        isOpen={isKnowledgeCenterOpen}
        onClose={() => setIsKnowledgeCenterOpen(false)}
        currentUser={currentUser}
      />

      <DailyMotivationalPosterModal
        isOpen={isDailyQuoteOpen}
        quote={dailyQuote}
        onClose={() => setIsDailyQuoteOpen(false)}
        dateString={getKolkataDateString()}
        userName={currentUser?.fullName || currentUser?.username}
      />
    </div>
  );
}
