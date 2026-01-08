import { useState, useEffect } from 'react';
import { UserX, Plus, Trash2, Clock, Shield, Copy, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface BurnerIdentity {
  id: string;
  alias: string;
  avatarColor: string;
  createdAt: Date;
  expiresAt: Date;
  messageCount: number;
  isActive: boolean;
}

const AVATAR_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
];

const RANDOM_ADJECTIVES = [
  'Shadow', 'Ghost', 'Silent', 'Dark', 'Night', 'Storm', 'Iron', 'Steel',
  'Phantom', 'Rogue', 'Stealth', 'Cipher', 'Echo', 'Frost', 'Thunder', 'Viper'
];

const RANDOM_NOUNS = [
  'Wolf', 'Hawk', 'Raven', 'Fox', 'Eagle', 'Serpent', 'Panther', 'Falcon',
  'Tiger', 'Dragon', 'Phoenix', 'Spectre', 'Hunter', 'Warrior', 'Guardian', 'Knight'
];

const generateRandomAlias = (): string => {
  const adj = RANDOM_ADJECTIVES[Math.floor(Math.random() * RANDOM_ADJECTIVES.length)];
  const noun = RANDOM_NOUNS[Math.floor(Math.random() * RANDOM_NOUNS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
};

const generateRandomColor = (): string => {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
};

export const BurnerIdentities = () => {
  const { user } = useAuth();
  const [identities, setIdentities] = useState<BurnerIdentity[]>([]);
  const [activeIdentity, setActiveIdentity] = useState<BurnerIdentity | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newIdentity, setNewIdentity] = useState({
    alias: '',
    avatarColor: generateRandomColor(),
    duration: '24', // hours
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'burner_identities'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const ids = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          expiresAt: doc.data().expiresAt?.toDate(),
        }))
        .filter(id => id.expiresAt > now) as BurnerIdentity[];

      setIdentities(ids);

      // Find active identity
      const active = ids.find(id => id.isActive);
      setActiveIdentity(active || null);
    });

    return () => unsubscribe();
  }, [user]);

  const createIdentity = async () => {
    if (!user) return;

    const alias = newIdentity.alias.trim() || generateRandomAlias();
    const durationHours = parseInt(newIdentity.duration);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    try {
      const identityId = `burner_${user.uid}_${Date.now()}`;
      await setDoc(doc(db, 'burner_identities', identityId), {
        userId: user.uid,
        alias,
        avatarColor: newIdentity.avatarColor,
        createdAt: serverTimestamp(),
        expiresAt,
        messageCount: 0,
        isActive: false,
      });

      toast.success(`Burner identity "${alias}" created!`);
      setIsCreateOpen(false);
      setNewIdentity({
        alias: '',
        avatarColor: generateRandomColor(),
        duration: '24',
      });
    } catch (error) {
      toast.error('Failed to create identity');
    }
  };

  const activateIdentity = async (identity: BurnerIdentity) => {
    if (!user) return;

    try {
      // Deactivate all other identities
      for (const id of identities) {
        if (id.id !== identity.id && id.isActive) {
          await setDoc(doc(db, 'burner_identities', id.id), {
            isActive: false,
          }, { merge: true });
        }
      }

      // Activate selected identity
      await setDoc(doc(db, 'burner_identities', identity.id), {
        isActive: true,
      }, { merge: true });

      toast.success(`Now chatting as "${identity.alias}"`);
    } catch (error) {
      toast.error('Failed to activate identity');
    }
  };

  const deactivateIdentity = async () => {
    if (!user || !activeIdentity) return;

    try {
      await setDoc(doc(db, 'burner_identities', activeIdentity.id), {
        isActive: false,
      }, { merge: true });

      toast.success('Switched back to your real identity');
    } catch (error) {
      toast.error('Failed to deactivate identity');
    }
  };

  const deleteIdentity = async (identityId: string) => {
    try {
      await deleteDoc(doc(db, 'burner_identities', identityId));
      toast.success('Identity burned (deleted)');
    } catch (error) {
      toast.error('Failed to delete identity');
    }
  };

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const regenerateAlias = () => {
    setNewIdentity({
      ...newIdentity,
      alias: generateRandomAlias(),
      avatarColor: generateRandomColor(),
    });
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <UserX className="w-5 h-5 text-red-500" />
          Burner Identities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Identity Warning */}
        {activeIdentity && (
          <div className="p-3 bg-red-500/20 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-medium">Anonymous Mode Active</span>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className={`w-10 h-10 ${activeIdentity.avatarColor}`}>
                <AvatarFallback className="text-white font-bold">
                  {activeIdentity.alias.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-white font-medium">{activeIdentity.alias}</p>
                <p className="text-gray-400 text-xs">
                  Expires in {getTimeRemaining(activeIdentity.expiresAt)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={deactivateIdentity}
                className="border-red-500 text-red-400 hover:bg-red-500/20"
              >
                Deactivate
              </Button>
            </div>
          </div>
        )}

        {/* Identity List */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {identities.filter(id => !id.isActive).map((identity) => (
            <div
              key={identity.id}
              className="p-3 bg-gray-700/50 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar className={`w-10 h-10 ${identity.avatarColor}`}>
                  <AvatarFallback className="text-white font-bold">
                    {identity.alias.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">{identity.alias}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires in {getTimeRemaining(identity.expiresAt)}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => activateIdentity(identity)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Use
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteIdentity(identity.id)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {identities.length === 0 && (
            <p className="text-gray-500 text-center py-4">No burner identities</p>
          )}
        </div>

        {/* Create New Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Burner Identity
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create Burner Identity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Preview */}
              <div className="flex items-center justify-center gap-3 p-4 bg-gray-700/50 rounded-lg">
                <Avatar className={`w-16 h-16 ${newIdentity.avatarColor}`}>
                  <AvatarFallback className="text-white text-2xl font-bold">
                    {(newIdentity.alias || 'A').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium text-lg">
                    {newIdentity.alias || 'Random Alias'}
                  </p>
                  <p className="text-gray-400 text-sm">Preview</p>
                </div>
              </div>

              {/* Alias Input */}
              <div>
                <label className="text-sm text-gray-400">Alias</label>
                <div className="flex gap-2">
                  <Input
                    value={newIdentity.alias}
                    onChange={(e) => setNewIdentity({ ...newIdentity, alias: e.target.value })}
                    placeholder="Enter alias or leave blank for random"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Button
                    variant="outline"
                    onClick={regenerateAlias}
                    className="border-gray-600"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="text-sm text-gray-400">Avatar Color</label>
                <div className="grid grid-cols-8 gap-2 mt-2">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewIdentity({ ...newIdentity, avatarColor: color })}
                      className={`w-8 h-8 rounded-full ${color} ${
                        newIdentity.avatarColor === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800'
                          : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Duration Selection */}
              <div>
                <label className="text-sm text-gray-400">Identity Lifespan</label>
                <Select
                  value={newIdentity.duration}
                  onValueChange={(value) => setNewIdentity({ ...newIdentity, duration: value })}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Warning */}
              <div className="p-3 bg-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                <strong>Note:</strong> Messages sent with this identity will show the burner alias.
                The identity will auto-delete after expiration.
              </div>

              <Button onClick={createIdentity} className="w-full bg-red-600 hover:bg-red-700">
                <Shield className="w-4 h-4 mr-2" />
                Create Identity
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// Hook for using burner identity in messages
export const useBurnerIdentity = () => {
  const { user } = useAuth();
  const [activeIdentity, setActiveIdentity] = useState<BurnerIdentity | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'burner_identities'),
      where('userId', '==', user.uid),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const active = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          expiresAt: doc.data().expiresAt?.toDate(),
        }))
        .find(id => id.expiresAt > now) as BurnerIdentity | undefined;

      setActiveIdentity(active || null);
    });

    return () => unsubscribe();
  }, [user]);

  const getSenderInfo = () => {
    if (activeIdentity) {
      return {
        name: activeIdentity.alias,
        isBurner: true,
        avatarColor: activeIdentity.avatarColor,
      };
    }
    return {
      name: user?.displayName || user?.email || 'Unknown',
      isBurner: false,
      avatarColor: null,
    };
  };

  return { activeIdentity, getSenderInfo };
};

export default BurnerIdentities;
