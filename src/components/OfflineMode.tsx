import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, Send, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  recipientName: string;
  createdAt: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed';
}

// IndexedDB wrapper for offline storage
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FortressOfflineDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('queued_messages')) {
        db.createObjectStore('queued_messages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_conversations')) {
        db.createObjectStore('cached_conversations', { keyPath: 'id' });
      }
    };
  });
};

const saveToIndexedDB = async (storeName: string, data: any) => {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.put(data);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const getAllFromIndexedDB = async (storeName: string): Promise<any[]> => {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteFromIndexedDB = async (storeName: string, id: string) => {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const useOfflineMode = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online!');
      syncQueuedMessages();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Messages will be queued.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load queued messages from IndexedDB
    loadQueuedMessages();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadQueuedMessages = async () => {
    try {
      const messages = await getAllFromIndexedDB('queued_messages');
      setQueuedMessages(messages);
    } catch (error) {
      console.error('Failed to load queued messages:', error);
    }
  };

  const queueMessage = async (conversationId: string, content: string, recipientName: string) => {
    const message: QueuedMessage = {
      id: `offline_${Date.now()}`,
      conversationId,
      content,
      recipientName,
      createdAt: new Date(),
      status: 'pending',
    };

    try {
      await saveToIndexedDB('queued_messages', message);
      setQueuedMessages(prev => [...prev, message]);
      toast.info('Message queued for sending when online');
      return message;
    } catch (error) {
      toast.error('Failed to queue message');
      return null;
    }
  };

  const syncQueuedMessages = async () => {
    if (!isOnline || !user || isSyncing) return;

    const messages = await getAllFromIndexedDB('queued_messages');
    if (messages.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;

    for (const message of messages) {
      try {
        // Update status to sending
        message.status = 'sending';
        await saveToIndexedDB('queued_messages', message);
        setQueuedMessages(prev =>
          prev.map(m => m.id === message.id ? { ...m, status: 'sending' } : m)
        );

        // Send to Firebase
        await addDoc(collection(db, 'direct_messages'), {
          conversationId: message.conversationId,
          senderId: user.uid,
          content: message.content,
          createdAt: serverTimestamp(),
          isOfflineSync: true,
        });

        // Remove from queue
        await deleteFromIndexedDB('queued_messages', message.id);
        setQueuedMessages(prev => prev.filter(m => m.id !== message.id));
        successCount++;
      } catch (error) {
        message.status = 'failed';
        await saveToIndexedDB('queued_messages', message);
        setQueuedMessages(prev =>
          prev.map(m => m.id === message.id ? { ...m, status: 'failed' } : m)
        );
      }
    }

    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`Synced ${successCount} queued message${successCount > 1 ? 's' : ''}`);
    }
  };

  const retryMessage = async (messageId: string) => {
    const message = queuedMessages.find(m => m.id === messageId);
    if (!message || !isOnline) return;

    await syncQueuedMessages();
  };

  const removeQueuedMessage = async (messageId: string) => {
    await deleteFromIndexedDB('queued_messages', messageId);
    setQueuedMessages(prev => prev.filter(m => m.id !== messageId));
    toast.success('Message removed from queue');
  };

  return {
    isOnline,
    queuedMessages,
    isSyncing,
    queueMessage,
    syncQueuedMessages,
    retryMessage,
    removeQueuedMessage,
  };
};

export const OfflineModeStatus = () => {
  const { isOnline, queuedMessages, isSyncing, syncQueuedMessages, retryMessage, removeQueuedMessage } = useOfflineMode();

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          Connection Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicator */}
        <div className={`p-3 rounded-lg flex items-center gap-3 ${
          isOnline ? 'bg-green-500/20' : 'bg-red-500/20'
        }`}>
          {isOnline ? (
            <>
              <Cloud className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-green-400 font-medium">Online</p>
                <p className="text-green-400/60 text-sm">Messages syncing in real-time</p>
              </div>
            </>
          ) : (
            <>
              <CloudOff className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-red-400 font-medium">Offline</p>
                <p className="text-red-400/60 text-sm">Messages will be queued</p>
              </div>
            </>
          )}
        </div>

        {/* Queued Messages */}
        {queuedMessages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">
                {queuedMessages.length} message{queuedMessages.length > 1 ? 's' : ''} queued
              </p>
              {isOnline && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={syncQueuedMessages}
                  disabled={isSyncing}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
              )}
            </div>

            {isSyncing && (
              <Progress value={50} className="h-1" />
            )}

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {queuedMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-2 bg-gray-700/50 rounded flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm truncate">
                      To: {message.recipientName}
                    </p>
                    <p className="text-gray-400 text-xs truncate">{message.content}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {message.status === 'sending' && (
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                    )}
                    {message.status === 'sent' && (
                      <Check className="w-4 h-4 text-green-400" />
                    )}
                    {message.status === 'failed' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => retryMessage(message.id)}
                          className="h-6 w-6 p-0 text-yellow-400"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeQueuedMessage(message.id)}
                          className="h-6 w-6 p-0 text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    {message.status === 'pending' && (
                      <Send className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {queuedMessages.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-2">
            No queued messages
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default OfflineModeStatus;
