
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/integrations/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { CallInterface } from '@/components/CallInterface';
import { StatusViewer } from '@/components/StatusViewer';
import { StatusCreator } from '@/components/StatusCreator';
import { MobileNavBar } from '@/components/MobileNavBar';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { UserSearchDialog } from '@/components/UserSearchDialog';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { useUserRisk } from '@/contexts/UserRiskContext';
import { StatusUser } from '@/services/statusService';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { cn } from '@/lib/utils';
import { syncFirebaseUserToSupabase } from '@/services/supabaseUserSyncService';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isMobile = useIsMobile();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewingStatus, setViewingStatus] = useState<StatusUser | null>(null);
  const [showStatusCreator, setShowStatusCreator] = useState(false);
  const [statusRefreshKey, setStatusRefreshKey] = useState(0);
  const [mobileTab, setMobileTab] = useState<'chats' | 'teams' | 'security' | 'profile'>('chats');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const navigate = useNavigate();
  const { switchToConversation } = useDirectMessages();
  const { hasCompletedOnboarding, loading: riskLoading } = useUserRisk();

  const handleStatusCreated = useCallback(() => {
    setStatusRefreshKey(prev => prev + 1);
  }, []);

  // Check if onboarding should be shown
  useEffect(() => {
    if (!riskLoading && user && !hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [hasCompletedOnboarding, riskLoading, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setInitializationError(null);

      if (!currentUser) {
        setUser(null);
        setLoading(false);
        navigate('/auth');
        return;
      }

      try {
        // Check if user has a valid call sign
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          // If no call sign set, redirect to setup
          if (!profileData.callSign) {
            setLoading(false);
            navigate('/setup-callsign');
            return;
          }

          syncFirebaseUserToSupabase(currentUser).catch((error) => {
            console.warn('Unable to sync Firebase user to Supabase:', error);
          });
        } else {
          // Profile doesn't exist yet, redirect to setup
          setLoading(false);
          navigate('/setup-callsign');
          return;
        }

        setUser(currentUser);
      } catch (error) {
        console.error('Error initializing user profile:', error);
        setUser(null);
        setInitializationError('Unable to load your profile. Please refresh the page or sign in again.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Mobile: return from a full-screen conversation to the chat list home.
  const handleBackToList = () => {
    setActiveChat(null);
    setSidebarOpen(false);
  };

  const handleStartConversation = (conversationId: string) => {
    switchToConversation(conversationId);
    setActiveChat(conversationId);
    setShowUserSearch(false);
  };

  // The open chat (or null). activeChat is set in every selection path, so it's the
  // single source of truth — clearing it returns to the mobile chat-list home.
  const getCurrentChatInfo = () =>
    activeChat ? { id: activeChat, type: 'direct' as const } : null;

  if (loading || riskLoading) {
    return (
      <div className="min-h-screen fortress-shell flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
          <p className="text-green-400 font-mono ft-body">INITIALIZING...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (initializationError) {
      return (
        <div className="min-h-screen fortress-shell flex items-center justify-center px-4">
          <div className="max-w-md text-center space-y-4">
            <p className="text-red-400 font-mono ft-body">{initializationError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-500"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  // Show onboarding for new users
  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  const currentChat = getCurrentChatInfo();
  // Mobile: a conversation fills the whole screen (no bottom nav) so the composer has
  // full room; the chat list keeps the bottom nav. Pad the bottom accordingly, always
  // including the device safe-area inset (home indicator / notch).
  const mobileBottomPad = isMobile
    ? currentChat
      ? 'pb-[env(safe-area-inset-bottom)]'
      : 'pb-[calc(4rem+env(safe-area-inset-bottom))]'
    : '';

  return (
    <div className="flex h-dvh flex-col overflow-hidden fortress-shell safe-area-inset">
      {isInCall ? (
        <div className="w-full px-2 md:px-4 py-4">
          <CallInterface
            callType={callType}
            onEndCall={() => setIsInCall(false)}
            contactName="Contact"
          />
        </div>
      ) : (
        <>
          <div className="fortress-classification-strip hidden md:flex">
            SECRET//NOFORN — CLASSIFIED CHANNEL — AUTHORIZED PERSONNEL ONLY
          </div>
          <div className={cn("flex min-h-0 w-full flex-1 overflow-hidden", mobileBottomPad)}>
            {/* Sidebar / chat list:
                desktop -> static left rail; mobile + no chat -> full-screen home;
                mobile + in a chat -> slide-in drawer (quick chat switch). */}
            <div
              className={cn(
                'flex flex-col transition-transform duration-300 ease-out',
                !isMobile && 'w-80',
                isMobile && !currentChat && 'w-full',
                isMobile && currentChat && cn(
                  'fixed inset-y-0 left-0 z-30 w-80',
                  sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
                ),
              )}
            >
              <Sidebar
                activeChat={currentChat?.id || ''}
                onChatSelect={handleChatSelect}
                statusRefreshKey={statusRefreshKey}
                onViewStatus={(statusUser) => setViewingStatus(statusUser)}
                onCreateStatus={() => setShowStatusCreator(true)}
                activeTab={isMobile ? (mobileTab === 'profile' ? 'chats' : mobileTab) : undefined}
                onTabChange={isMobile ? setMobileTab : undefined}
              />
            </div>

            {/* Mobile drawer overlay (only when in a conversation with the drawer open) */}
            {isMobile && currentChat && sidebarOpen && (
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 transition-opacity duration-300"
                  onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Conversation — desktop always; mobile only when a chat is open */}
            {(!isMobile || currentChat) && (
              <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
                {/* flex column so ChatArea fills via flex (reliable), not h-full % */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <ChatArea
                    activeChat={currentChat?.id || ''}
                    onStartCall={(type) => {
                      setCallType(type);
                      setIsInCall(true);
                    }}
                    onToggleSidebar={() => setSidebarOpen(true)}
                    onBack={handleBackToList}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mobile Bottom Navigation — chat list (home) only; a conversation is full-screen.
              Tabs drive the full-screen list's segmented view (no drawer needed). */}
          {isMobile && !currentChat && (
            <MobileNavBar
              activeTab={mobileTab}
              onTabChange={setMobileTab}
              onNewChat={() => setShowUserSearch(true)}
            />
          )}

          {/* PWA Install Prompt */}
          <PWAInstallPrompt />

          {/* User Search Dialog */}
          <UserSearchDialog
            isOpen={showUserSearch}
            onClose={() => setShowUserSearch(false)}
            onStartConversation={handleStartConversation}
          />

          {/* Status Viewer */}
          {viewingStatus && (
            <StatusViewer
              statusUser={viewingStatus}
              onClose={() => setViewingStatus(null)}
              onDeleted={handleStatusCreated}
            />
          )}

          {/* Status Creator */}
          <StatusCreator
            isOpen={showStatusCreator}
            onClose={() => setShowStatusCreator(false)}
            onCreated={handleStatusCreated}
          />
        </>
      )}
    </div>
  );
};

export default Index;
