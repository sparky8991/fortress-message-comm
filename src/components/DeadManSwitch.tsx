import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Send, Trash2, Plus, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DeadManMessage {
  id: string;
  recipientId: string;
  recipientName: string;
  message: string;
  inactivityDays: number;
  enabled: boolean;
  lastCheckIn: Date;
  createdAt: Date;
}

export const DeadManSwitch = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DeadManMessage[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<DeadManMessage | null>(null);
  const [formData, setFormData] = useState({
    recipientId: '',
    recipientName: '',
    message: '',
    inactivityDays: '7',
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'dead_man_switches'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastCheckIn: doc.data().lastCheckIn?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as DeadManMessage[];
      setMessages(msgs);
    });

    // Update last check-in on mount
    updateLastCheckIn();

    return () => unsubscribe();
  }, [user]);

  const updateLastCheckIn = async () => {
    if (!user) return;

    const userRef = doc(db, 'user_activity', user.uid);
    await setDoc(userRef, {
      lastCheckIn: serverTimestamp(),
      userId: user.uid,
    }, { merge: true });
  };

  const saveMessage = async () => {
    if (!user) return;

    if (!formData.recipientName || !formData.message) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const messageId = editingMessage?.id || `dms_${Date.now()}`;
      await setDoc(doc(db, 'dead_man_switches', messageId), {
        userId: user.uid,
        recipientId: formData.recipientId,
        recipientName: formData.recipientName,
        message: formData.message,
        inactivityDays: parseInt(formData.inactivityDays),
        enabled: true,
        lastCheckIn: serverTimestamp(),
        createdAt: editingMessage?.createdAt || serverTimestamp(),
      });

      toast.success(editingMessage ? 'Message updated' : 'Dead man switch created');
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save message');
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'dead_man_switches', id));
      toast.success('Dead man switch deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const toggleEnabled = async (message: DeadManMessage) => {
    try {
      await setDoc(doc(db, 'dead_man_switches', message.id), {
        enabled: !message.enabled,
      }, { merge: true });
      toast.success(message.enabled ? 'Switch disabled' : 'Switch enabled');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const checkIn = async () => {
    await updateLastCheckIn();
    toast.success('Check-in recorded! Your dead man switches have been reset.');
  };

  const resetForm = () => {
    setFormData({
      recipientId: '',
      recipientName: '',
      message: '',
      inactivityDays: '7',
    });
    setEditingMessage(null);
  };

  const editMessage = (message: DeadManMessage) => {
    setEditingMessage(message);
    setFormData({
      recipientId: message.recipientId,
      recipientName: message.recipientName,
      message: message.message,
      inactivityDays: message.inactivityDays.toString(),
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Dead Man's Switch
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Automatically send messages if you're inactive for a set period
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Check-in Button */}
          <Button
            onClick={checkIn}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Check In (Reset Timers)
          </Button>

          {/* Warning */}
          <div className="p-3 bg-orange-500/20 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-orange-300 text-sm">
              Messages will be sent automatically if you don't check in within the specified time.
              Make sure to check in regularly to prevent accidental sends.
            </p>
          </div>

          {/* Message List */}
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className="p-3 bg-gray-700/50 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium">{message.recipientName}</span>
                  </div>
                  <Switch
                    checked={message.enabled}
                    onCheckedChange={() => toggleEnabled(message)}
                  />
                </div>
                <p className="text-gray-400 text-sm truncate">{message.message}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Sends after {message.inactivityDays} days of inactivity
                  </span>
                  <div className="flex gap-1">
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
              </div>
            ))}
          </div>

          {/* Add New Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={resetForm}
                className="w-full bg-gray-700 hover:bg-gray-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Dead Man's Switch
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingMessage ? 'Edit' : 'Create'} Dead Man's Switch
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Recipient Name</label>
                  <Input
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    placeholder="Enter recipient name"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Message</label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter your message..."
                    className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Send After Inactivity</label>
                  <Select
                    value={formData.inactivityDays}
                    onValueChange={(value) => setFormData({ ...formData, inactivityDays: value })}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={saveMessage} className="w-full bg-green-600 hover:bg-green-700">
                  {editingMessage ? 'Update' : 'Create'} Switch
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeadManSwitch;
