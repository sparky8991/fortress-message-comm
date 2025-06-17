
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { CallInterface } from '@/components/CallInterface';
import { Session } from '@supabase/supabase-js';
import { Loader2, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [activeChat, setActiveChat] = useState('alice-johnson');
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        navigate('/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      }
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
          <p className="text-green-400 font-mono text-sm">INITIALIZING_SECURE_CONNECTION...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black flex overflow-hidden h-screen">
      {isInCall ? (
        <CallInterface 
          callType={callType}
          onEndCall={() => setIsInCall(false)}
          contactName="Alice Johnson"
        />
      ) : (
        <>
          <div
            className={cn(
                'md:flex flex-col',
                'transition-all duration-300 ease-out',
                'fixed md:static inset-y-0 left-0 z-30 w-80',
                isMobile ? (sidebarOpen ? 'translate-x-0 flex shadow-2xl' : '-translate-x-full') : 'flex'
            )}
          >
            <Sidebar 
              activeChat={activeChat}
              onChatSelect={handleChatSelect}
            />
          </div>

          {isMobile && sidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 transition-opacity duration-300" 
                onClick={() => setSidebarOpen(false)} 
              />
          )}

          <div className="flex-1 flex flex-col relative">
              {isMobile && (
                  <button 
                      onClick={() => setSidebarOpen(true)}
                      className="fixed top-4 left-4 z-50 p-3 bg-gray-800/95 hover:bg-gray-700/95 rounded-xl text-white backdrop-blur-sm border border-gray-600/60 shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Open sidebar"
                  >
                      <Menu className="h-5 w-5" />
                  </button>
              )}
              <ChatArea 
                activeChat={activeChat}
                onStartCall={(type) => {
                  setCallType(type);
                  setIsInCall(true);
                }}
              />
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
