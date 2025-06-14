
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { CallInterface } from '@/components/CallInterface';
import { Session } from '@supabase/supabase-js';
import { Loader2, PanelLeft } from 'lucide-react';
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
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null; // or a redirect component, but navigate handles it
  }

  return (
    <div className="min-h-screen bg-gray-900 flex overflow-hidden h-screen">
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
                'transition-transform duration-300 ease-in-out',
                'fixed md:static inset-y-0 left-0 z-30 w-80',
                isMobile ? (sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full') : 'flex'
            )}
          >
            <Sidebar 
              activeChat={activeChat}
              onChatSelect={handleChatSelect}
            />
          </div>

          {isMobile && sidebarOpen && (
              <div className="fixed inset-0 bg-black/50 z-20" onClick={() => setSidebarOpen(false)} />
          )}

          <div className="flex-1 flex flex-col relative">
              {isMobile && (
                  <button 
                      onClick={() => setSidebarOpen(true)}
                      className="absolute top-5 left-4 z-10 p-2 bg-gray-700/50 hover:bg-gray-700 rounded-full text-white backdrop-blur-sm"
                  >
                      <PanelLeft className="h-5 w-5" />
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
