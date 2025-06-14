
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { CallInterface } from '@/components/CallInterface';
import { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState('alice-johnson');
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
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
    <div className="min-h-screen bg-gray-900 flex">
      {isInCall ? (
        <CallInterface 
          callType={callType}
          onEndCall={() => setIsInCall(false)}
          contactName="Alice Johnson"
        />
      ) : (
        <>
          <Sidebar 
            activeChat={activeChat}
            onChatSelect={setActiveChat}
          />
          <ChatArea 
            activeChat={activeChat}
            onStartCall={(type) => {
              setCallType(type);
              setIsInCall(true);
            }}
          />
        </>
      )}
    </div>
  );
};

export default Index;
