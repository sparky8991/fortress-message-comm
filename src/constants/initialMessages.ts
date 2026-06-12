
export type MessageMetadata = Record<string, unknown> & {
  isVoiceMessage?: boolean;
  duration?: number;
  mimeType?: string;
  originalName?: string;
  burnAfterRead?: boolean;
  burnAfterReadSeconds?: number;
  burnOpenedAt?: unknown;
  burnExpiresAt?: unknown;
  burnOpenedBy?: string | null;
};

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: 'me' | 'contact';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  encrypted: boolean;
  sentAt: Date;
  attachment?: {
    name: string;
    url: string;
    type: string;
    metadata?: MessageMetadata;
  };
  metadata?: MessageMetadata;
  replyTo?: {
    messageId: string;
    messageText: string;
    sender: string;
  };
}

export const initialMessagesByChat = {
  'alice-johnson': [
    {
      id: '1',
      text: 'Hey, are you ready for the secure file transfer?',
      timestamp: '10:30 AM',
      sender: 'contact' as const,
      status: 'read' as const,
      encrypted: true,
      sentAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    },
    {
      id: '2',
      text: 'Yes, all encryption protocols are active. Ready to receive.',
      timestamp: '10:32 AM',
      sender: 'me' as const,
      status: 'delivered' as const, // Changed to show unread status
      encrypted: true,
      sentAt: new Date(Date.now() - 28 * 60 * 1000) // 28 minutes ago
    },
    {
      id: '3',
      text: 'Perfect! The encrypted files have been sent securely through our protected channel.',
      timestamp: '10:35 AM',
      sender: 'contact' as const,
      status: 'read' as const,
      encrypted: true,
      sentAt: new Date(Date.now() - 25 * 60 * 1000)
    },
    {
      id: '4',
      text: 'Received and verified. All checksums match. Thanks for the secure transfer! 🔒',
      timestamp: '10:37 AM',
      sender: 'me' as const,
      status: 'delivered' as const,
      encrypted: true,
      sentAt: new Date(Date.now() - 7 * 60 * 1000) // 7 minutes ago - should trigger notification
    }
  ],
  'bob-smith': [
    {
      id: '1',
      text: 'Mission briefing at 1400 hours. Secure channel required.',
      timestamp: '9:15 AM',
      sender: 'contact' as const,
      status: 'read' as const,
      encrypted: true,
      sentAt: new Date()
    },
    {
      id: '2',
      text: 'Roger that, mission parameters confirmed. Encryption level set to maximum.',
      timestamp: '9:16 AM',
      sender: 'me' as const,
      status: 'read' as const,
      encrypted: true,
      sentAt: new Date()
    }
  ]
};
