import { useState, useEffect } from 'react';
import { Circle, Plus, Eye, Trash2, Clock, Image, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db, storage } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface StatusUpdate {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  imageUrl?: string;
  expiresAt: Date;
  createdAt: Date;
  views: string[];
}

export const StatusUpdates = () => {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<StatusUpdate[]>([]);
  const [myStatus, setMyStatus] = useState<StatusUpdate | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingStatus, setViewingStatus] = useState<StatusUpdate | null>(null);
  const [newStatusContent, setNewStatusContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Get all statuses that haven't expired
    const now = new Date();
    const statusQuery = query(
      collection(db, 'status_updates'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(statusQuery, (snapshot) => {
      const statusList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          expiresAt: doc.data().expiresAt?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
        }))
        .filter(s => s.expiresAt > now) as StatusUpdate[];

      // Separate my status from others
      const mine = statusList.find(s => s.userId === user.uid);
      setMyStatus(mine || null);
      setStatuses(statusList.filter(s => s.userId !== user.uid));
    });

    return () => unsubscribe();
  }, [user]);

  const createStatus = async () => {
    if (!user) return;
    if (!newStatusContent.trim() && !selectedImage) {
      toast.error('Please add text or an image');
      return;
    }

    setIsUploading(true);

    try {
      let imageUrl = '';

      if (selectedImage) {
        const storageRef = ref(storage, `status/${user.uid}/${Date.now()}`);
        await uploadBytes(storageRef, selectedImage);
        imageUrl = await getDownloadURL(storageRef);
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      const statusId = `status_${user.uid}`;
      await setDoc(doc(db, 'status_updates', statusId), {
        userId: user.uid,
        userName: user.displayName || user.email,
        userAvatar: user.photoURL,
        content: newStatusContent.trim(),
        imageUrl,
        expiresAt,
        createdAt: serverTimestamp(),
        views: [],
      });

      toast.success('Status posted!');
      setIsCreateOpen(false);
      setNewStatusContent('');
      setSelectedImage(null);
    } catch (error) {
      toast.error('Failed to post status');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteStatus = async () => {
    if (!user || !myStatus) return;

    try {
      await deleteDoc(doc(db, 'status_updates', myStatus.id));
      toast.success('Status deleted');
    } catch (error) {
      toast.error('Failed to delete status');
    }
  };

  const viewStatus = async (status: StatusUpdate) => {
    if (!user) return;

    setViewingStatus(status);

    // Record view if not already viewed
    if (!status.views.includes(user.uid)) {
      try {
        await setDoc(doc(db, 'status_updates', status.id), {
          views: [...status.views, user.uid],
        }, { merge: true });
      } catch (error) {
        console.error('Failed to record view:', error);
      }
    }
  };

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Circle className="w-5 h-5 text-green-500 fill-green-500" />
          Status Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* My Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => myStatus ? viewStatus(myStatus) : setIsCreateOpen(true)}
            className="relative"
          >
            <div className={`w-14 h-14 rounded-full p-0.5 ${
              myStatus ? 'bg-gradient-to-r from-green-500 to-blue-500' : 'bg-gray-600'
            }`}>
              <Avatar className="w-full h-full border-2 border-gray-800">
                <AvatarImage src={user?.photoURL || ''} />
                <AvatarFallback className="bg-gray-700 text-white">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            </div>
            {!myStatus && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Plus className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
          <div className="flex-1">
            <p className="text-white font-medium">My Status</p>
            <p className="text-gray-400 text-sm">
              {myStatus ? `Expires in ${getTimeRemaining(myStatus.expiresAt)}` : 'Tap to add status'}
            </p>
          </div>
          {myStatus && (
            <Button
              size="sm"
              variant="ghost"
              onClick={deleteStatus}
              className="text-gray-400 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Other Statuses */}
        <ScrollArea className="h-48">
          <div className="space-y-3">
            {statuses.map((status) => (
              <button
                key={status.id}
                onClick={() => viewStatus(status)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-r from-green-500 to-blue-500">
                  <Avatar className="w-full h-full border-2 border-gray-800">
                    <AvatarImage src={status.userAvatar} />
                    <AvatarFallback className="bg-gray-700 text-white">
                      {status.userName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white text-sm font-medium">{status.userName}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getTimeRemaining(status.expiresAt)} left
                  </p>
                </div>
                {status.views.includes(user?.uid || '') && (
                  <Eye className="w-4 h-4 text-gray-500" />
                )}
              </button>
            ))}
            {statuses.length === 0 && (
              <p className="text-gray-500 text-center py-4">No status updates</p>
            )}
          </div>
        </ScrollArea>

        {/* Create Status Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Post Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={newStatusContent}
                onChange={(e) => setNewStatusContent(e.target.value)}
                placeholder="What's on your mind?"
                className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
              />

              {selectedImage && (
                <div className="relative">
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-gray-600"
                  onClick={() => document.getElementById('status-image')?.click()}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Add Image
                </Button>
                <input
                  id="status-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                />
              </div>

              <Button
                onClick={createStatus}
                disabled={isUploading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isUploading ? 'Posting...' : 'Post Status'}
              </Button>

              <p className="text-gray-500 text-xs text-center">
                Status will expire after 24 hours
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Status Dialog */}
        <Dialog open={!!viewingStatus} onOpenChange={() => setViewingStatus(null)}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md p-0">
            {viewingStatus && (
              <div className="relative">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={viewingStatus.userAvatar} />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {viewingStatus.userName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">{viewingStatus.userName}</p>
                      <p className="text-gray-400 text-xs">
                        {viewingStatus.createdAt?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="min-h-[300px] flex items-center justify-center bg-gray-800 p-8">
                  {viewingStatus.imageUrl ? (
                    <img
                      src={viewingStatus.imageUrl}
                      alt="Status"
                      className="max-w-full max-h-[400px] object-contain"
                    />
                  ) : (
                    <p className="text-white text-xl text-center">{viewingStatus.content}</p>
                  )}
                </div>

                {/* Footer with text if image exists */}
                {viewingStatus.imageUrl && viewingStatus.content && (
                  <div className="p-4 bg-gray-900">
                    <p className="text-white">{viewingStatus.content}</p>
                  </div>
                )}

                {/* Views count */}
                <div className="p-3 bg-gray-900 border-t border-gray-700 flex items-center gap-2 text-gray-400">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{viewingStatus.views.length} views</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default StatusUpdates;
