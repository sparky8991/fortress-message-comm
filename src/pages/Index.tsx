
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/integrations/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { CallInterface } from '@/components/CallInterface';
import { StatusBar } from '@/components/StatusBar';
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
  const { activeConversation, switchToConversation } = useDirectMessages();
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

  const handleStartConversation = (conversationId: string) => {
    switchToConversation(conversationId);
    setActiveChat(conversationId);
    setShowUserSearch(false);
  };

  // Determine the current chat type and ID
  const getCurrentChatInfo = () => {
    if (activeConversation) {
      return {
        id: activeConversation,
        type: 'direct' as const
      };
    }
    if (activeChat) {
      return {
        id: activeChat,
        type: 'team' as const
      };
    }
    return null; // No active chat
  };

  if (loading || riskLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
          <p className="text-green-400 font-mono text-sm">INITIALIZING...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (initializationError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-md text-center space-y-4">
            <p className="text-red-400 font-mono text-sm">{initializationError}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black safe-area-inset">
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
          <div className={cn(
            "flex w-full h-screen",
            isMobile && "pb-16" // Make room for bottom nav
          )}>
            {/* Sidebar - hidden on mobile, shown on desktop */}
            <div
              className={cn(
                  'md:flex flex-col',
                  'transition-all duration-300 ease-out',
                  'fixed md:static inset-y-0 left-0 z-30 w-80',
                  isMobile ? (sidebarOpen ? 'translate-x-0 flex shadow-2xl' : '-translate-x-full') : 'flex'
              )}
            >
              <Sidebar
                activeChat={currentChat?.id || ''}
                onChatSelect={handleChatSelect}
              />
            </div>

            {/* Mobile overlay */}
            {isMobile && sidebarOpen && (
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 transition-opacity duration-300"
                  onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content area */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Status Bar */}
              <StatusBar
                key={statusRefreshKey}
                onViewStatus={(statusUser) => setViewingStatus(statusUser)}
                onCreateStatus={() => setShowStatusCreator(true)}
              />

              {/* Chat area */}
              <div className={cn(
                "flex-1 min-h-0",
                isMobile && "pb-safe" // Extra padding for safe area
              )}>
                <ChatArea
                  activeChat={currentChat?.id || ''}
                  onStartCall={(type) => {
                    setCallType(type);
                    setIsInCall(true);
                  }}
                  onToggleSidebar={() => setSidebarOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          {isMobile && (
            <MobileNavBar
              activeTab={mobileTab}
              onTabChange={(tab) => {
                setMobileTab(tab);
                if (tab === 'chats' || tab === 'teams' || tab === 'security') {
                  setSidebarOpen(true);
                }
              }}
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
