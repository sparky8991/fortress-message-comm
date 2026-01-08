
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/integrations/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { CallInterface } from '@/components/CallInterface';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { cn } from '@/lib/utils';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { activeConversation } = useDirectMessages();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        navigate('/auth');
        return;
      }

      // Check if user has a valid call sign
      const profileRef = doc(db, 'profiles', currentUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        // If no call sign set, redirect to setup
        if (!profileData.callSign) {
          navigate('/setup-callsign');
          return;
        }
      } else {
        // Profile doesn't exist yet, redirect to setup
        navigate('/setup-callsign');
        return;
      }

      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    if (isMobile) {
      setSidebarOpen(false);
    }
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

  if (loading) {
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
    return null;
  }

  const currentChat = getCurrentChatInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black">
      {isInCall ? (
        <div className="w-full px-2 md:px-4 py-4">
          <CallInterface 
            callType={callType}
            onEndCall={() => setIsInCall(false)}
            contactName="Contact"
          />
        </div>
      ) : (
        <div className="flex w-full">
          {/* Sidebar */}
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

          {/* Main chat area */}
          <div className="flex-1 min-w-0">
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
      )}
    </div>
  );
};

export default Index;
