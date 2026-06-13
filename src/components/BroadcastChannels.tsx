import { useState, useEffect } from 'react';
import { Radio, Users, Send, Plus, Settings, Trash2, UserPlus, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface BroadcastChannel {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorName: string;
  subscriberCount: number;
  createdAt: Date;
}

interface BroadcastMessage {
  id: string;
  channelId: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
}

export const BroadcastChannels = () => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<BroadcastChannel[]>([]);
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<BroadcastChannel | null>(null);
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!user) return;

    // Listen to all broadcast channels
    const channelsQuery = query(collection(db, 'broadcast_channels'), orderBy('createdAt', 'desc'));
    const unsubChannels = onSnapshot(channelsQuery, (snapshot) => {
      const channelList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as BroadcastChannel[];
      setChannels(channelList);
    });

    // Listen to user's subscriptions
    const subsQuery = query(
      collection(db, 'broadcast_subscriptions'),
      where('userId', '==', user.uid)
    );
    const unsubSubs = onSnapshot(subsQuery, (snapshot) => {
      const subs = snapshot.docs.map(doc => doc.data().channelId);
      setSubscribedChannels(subs);
    });

    return () => {
      unsubChannels();
      unsubSubs();
    };
  }, [user]);

  useEffect(() => {
    if (!selectedChannel) return;

    // Listen to messages for selected channel
    const messagesQuery = query(
      collection(db, 'broadcast_messages'),
      where('channelId', '==', selectedChannel.id),
      orderBy('createdAt', 'desc')
    );

    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as BroadcastMessage[];
      setMessages(msgs.reverse());
    });

    return () => unsubMessages();
  }, [selectedChannel]);

  const createChannel = async () => {
    if (!user) return;

    if (!newChannelData.name.trim()) {
      toast.error('Please enter a channel name');
      return;
    }

    try {
      const channelRef = doc(collection(db, 'broadcast_channels'));
      await setDoc(channelRef, {
        name: newChannelData.name.trim(),
        description: newChannelData.description.trim(),
        creatorId: user.uid,
        creatorName: user.displayName || user.email,
        subscriberCount: 1,
        createdAt: serverTimestamp(),
      });

      // Auto-subscribe creator
      await setDoc(doc(db, 'broadcast_subscriptions', `${user.uid}_${channelRef.id}`), {
        userId: user.uid,
        channelId: channelRef.id,
        subscribedAt: serverTimestamp(),
      });

      toast.success('Channel created!');
      setIsCreateOpen(false);
      setNewChannelData({ name: '', description: '' });
    } catch (error) {
      toast.error('Failed to create channel');
    }
  };

  const subscribeToChannel = async (channelId: string) => {
    if (!user) return;

    try {
      await setDoc(doc(db, 'broadcast_subscriptions', `${user.uid}_${channelId}`), {
        userId: user.uid,
        channelId,
        subscribedAt: serverTimestamp(),
      });
      toast.success('Subscribed to channel');
    } catch (error) {
      toast.error('Failed to subscribe');
    }
  };

  const unsubscribeFromChannel = async (channelId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'broadcast_subscriptions', `${user.uid}_${channelId}`));
      toast.success('Unsubscribed from channel');
    } catch (error) {
      toast.error('Failed to unsubscribe');
    }
  };

  const sendBroadcast = async () => {
    if (!user || !selectedChannel || !newMessage.trim()) return;

    // Only channel creator can broadcast
    if (selectedChannel.creatorId !== user.uid) {
      toast.error('Only the channel creator can broadcast');
      return;
    }

    try {
      await addDoc(collection(db, 'broadcast_messages'), {
        channelId: selectedChannel.id,
        content: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.email,
        createdAt: serverTimestamp(),
      });

      setNewMessage('');
      toast.success('Broadcast sent!');
    } catch (error) {
      toast.error('Failed to send broadcast');
    }
  };

  const deleteChannel = async (channelId: string) => {
    try {
      await deleteDoc(doc(db, 'broadcast_channels', channelId));
      setSelectedChannel(null);
      toast.success('Channel deleted');
    } catch (error) {
      toast.error('Failed to delete channel');
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-500" />
          Broadcast Channels
        </CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-1" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create Broadcast Channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Channel name"
                value={newChannelData.name}
                onChange={(e) => setNewChannelData({ ...newChannelData, name: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Textarea
                placeholder="Description (optional)"
                value={newChannelData.description}
                onChange={(e) => setNewChannelData({ ...newChannelData, description: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Button onClick={createChannel} className="w-full bg-red-600 hover:bg-red-700">
                Create Channel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedChannel ? (
          // Channel View
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChannel(null)}
                className="text-gray-400"
              >
                ← Back
              </Button>
              {selectedChannel.creatorId === user?.uid && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteChannel(selectedChannel.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-4 h-4 text-red-500" />
                <span className="text-white font-medium">{selectedChannel.name}</span>
                {selectedChannel.creatorId === user?.uid && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
              </div>
              {selectedChannel.description && (
                <p className="text-gray-400 ft-body">{selectedChannel.description}</p>
              )}
              <p className="text-gray-500 ft-meta mt-1">
                <Users className="w-3 h-3 inline mr-1" />
                {selectedChannel.subscriberCount || 0} subscribers
              </p>
            </div>

            {/* Messages */}
            <ScrollArea className="h-48 bg-gray-900/50 rounded-lg p-3">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No broadcasts yet</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="p-2 bg-gray-700/50 rounded">
                      <p className="text-white ft-body">{msg.content}</p>
                      <p className="text-gray-500 ft-meta mt-1">
                        {msg.senderName} • {msg.createdAt?.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Broadcast Input (only for creator) */}
            {selectedChannel.creatorId === user?.uid && (
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your broadcast..."
                  onKeyPress={(e) => e.key === 'Enter' && sendBroadcast()}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button onClick={sendBroadcast} className="bg-red-600 hover:bg-red-700">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Channel List
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {channels.map((channel) => {
              const isSubscribed = subscribedChannels.includes(channel.id);
              const isCreator = channel.creatorId === user?.uid;

              return (
                <div
                  key={channel.id}
                  className="p-3 bg-gray-700/50 rounded-lg flex items-center justify-between"
                >
                  <button
                    onClick={() => setSelectedChannel(channel)}
                    className="flex items-center gap-3 text-left min-w-0 flex-1"
                  >
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                      <Radio className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-white font-medium truncate">{channel.name}</span>
                        {isCreator && <Crown className="w-3 h-3 text-yellow-500" />}
                      </div>
                      <p className="text-gray-500 ft-meta">
                        {channel.subscriberCount || 0} subscribers
                      </p>
                    </div>
                  </button>

                  {!isCreator && (
                    <Button
                      size="sm"
                      variant={isSubscribed ? 'outline' : 'default'}
                      onClick={() => isSubscribed ? unsubscribeFromChannel(channel.id) : subscribeToChannel(channel.id)}
                      className={isSubscribed ? 'border-gray-600' : 'bg-red-600 hover:bg-red-700'}
                    >
                      {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                    </Button>
                  )}
                </div>
              );
            })}
            {channels.length === 0 && (
              <p className="text-gray-500 text-center py-4">No broadcast channels yet</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BroadcastChannels;
