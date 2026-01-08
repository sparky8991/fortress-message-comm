import { useState, useEffect } from 'react';
import { Calendar, Clock, Send, Trash2, Edit2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ScheduledMessage {
  id: string;
  conversationId: string;
  conversationName: string;
  content: string;
  scheduledFor: Date;
  createdAt: Date;
  sent: boolean;
}

export const ScheduledMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [formData, setFormData] = useState({
    conversationId: '',
    conversationName: '',
    content: '',
    scheduledDate: '',
    scheduledTime: '',
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'scheduled_messages'),
      where('userId', '==', user.uid),
      where('sent', '==', false),
      orderBy('scheduledFor', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledFor: doc.data().scheduledFor?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as ScheduledMessage[];
      setMessages(msgs);
    });

    // Check for messages to send every minute
    const checkInterval = setInterval(checkAndSendMessages, 60000);

    return () => {
      unsubscribe();
      clearInterval(checkInterval);
    };
  }, [user]);

  const checkAndSendMessages = async () => {
    // This would typically be done by a cloud function
    // For now, we check on the client side
    const now = new Date();
    for (const message of messages) {
      if (message.scheduledFor <= now && !message.sent) {
        await sendScheduledMessage(message);
      }
    }
  };

  const sendScheduledMessage = async (message: ScheduledMessage) => {
    if (!user) return;

    try {
      // Send the actual message
      await setDoc(doc(collection(db, 'direct_messages')), {
        conversationId: message.conversationId,
        senderId: user.uid,
        content: message.content,
        createdAt: new Date(),
        isScheduled: true,
      });

      // Mark as sent
      await setDoc(doc(db, 'scheduled_messages', message.id), {
        sent: true,
        sentAt: new Date(),
      }, { merge: true });

      toast.success(`Scheduled message sent to ${message.conversationName}`);
    } catch (error) {
      toast.error('Failed to send scheduled message');
    }
  };

  const saveMessage = async () => {
    if (!user) return;

    if (!formData.content || !formData.scheduledDate || !formData.scheduledTime) {
      toast.error('Please fill in all fields');
      return;
    }

    const scheduledFor = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);

    if (scheduledFor <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    try {
      const messageId = editingMessage?.id || `sched_${Date.now()}`;
      await setDoc(doc(db, 'scheduled_messages', messageId), {
        userId: user.uid,
        conversationId: formData.conversationId || 'general',
        conversationName: formData.conversationName || 'General',
        content: formData.content,
        scheduledFor,
        createdAt: editingMessage?.createdAt || new Date(),
        sent: false,
      });

      toast.success(editingMessage ? 'Message updated' : 'Message scheduled');
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to schedule message');
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'scheduled_messages', id));
      toast.success('Scheduled message deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const editMessage = (message: ScheduledMessage) => {
    setEditingMessage(message);
    const date = message.scheduledFor;
    setFormData({
      conversationId: message.conversationId,
      conversationName: message.conversationName,
      content: message.content,
      scheduledDate: date.toISOString().split('T')[0],
      scheduledTime: date.toTimeString().slice(0, 5),
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      conversationId: '',
      conversationName: '',
      content: '',
      scheduledDate: '',
      scheduledTime: '',
    });
    setEditingMessage(null);
  };

  const formatScheduledTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    if (hours > 0) {
      return `In ${hours}h ${minutes}m`;
    }

    return `In ${minutes}m`;
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Scheduled Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className="p-3 bg-gray-700/50 rounded-lg space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">
                  {message.conversationName}
                </span>
                <div className="flex items-center gap-1 text-blue-400 text-xs">
                  <Clock className="w-3 h-3" />
                  {formatScheduledTime(message.scheduledFor)}
                </div>
              </div>
              <p className="text-gray-400 text-sm line-clamp-2">{message.content}</p>
              <div className="flex justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => editMessage(message)}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMessage(message.id)}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-gray-500 text-center py-4">No scheduled messages</p>
          )}
        </div>

        {/* Schedule New Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Message
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingMessage ? 'Edit' : 'Schedule'} Message
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Recipient/Channel</label>
                <Input
                  value={formData.conversationName}
                  onChange={(e) => setFormData({ ...formData, conversationName: e.target.value })}
                  placeholder="Enter recipient name"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Message</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter your message..."
                  className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400">Date</label>
                  <Input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Time</label>
                  <Input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              <Button onClick={saveMessage} className="w-full bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" />
                {editingMessage ? 'Update' : 'Schedule'} Message
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ScheduledMessages;
