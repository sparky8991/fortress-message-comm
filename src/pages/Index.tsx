
import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { CallInterface } from '@/components/CallInterface';

const Index = () => {
  const [activeChat, setActiveChat] = useState('alice-johnson');
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');

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
