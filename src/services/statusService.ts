import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '@/integrations/firebase/client';

export interface Status {
  id: string;
  user_id: string;
  content_type: 'text' | 'image';
  content: string; // text content or image URL
  background_color?: string; // for text statuses
  created_at: Date;
  expires_at: Date;
  views: string[]; // array of user IDs who viewed
}

export interface StatusUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  statuses: Status[];
  hasUnviewed: boolean;
}

const STATUSES_COLLECTION = 'statuses';
const STATUS_DURATION_HOURS = 24;

// Create a new text status
export const createTextStatus = async (content: string, backgroundColor: string): Promise<Status | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + STATUS_DURATION_HOURS);

    const statusData = {
      user_id: user.uid,
      content_type: 'text',
      content,
      background_color: backgroundColor,
      created_at: serverTimestamp(),
      expires_at: Timestamp.fromDate(expiresAt),
      views: []
    };

    const docRef = await addDoc(collection(db, STATUSES_COLLECTION), statusData);

    return {
      id: docRef.id,
      ...statusData,
      created_at: new Date(),
      expires_at: expiresAt
    } as Status;
  } catch (error) {
    console.error('Error creating text status:', error);
    return null;
  }
};

// Create a new image status
export const createImageStatus = async (imageFile: File): Promise<Status | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    // Upload image to storage
    const timestamp = Date.now();
    const filePath = `statuses/${user.uid}/${timestamp}_${imageFile.name}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, imageFile);
    const imageUrl = await getDownloadURL(storageRef);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + STATUS_DURATION_HOURS);

    const statusData = {
      user_id: user.uid,
      content_type: 'image',
      content: imageUrl,
      created_at: serverTimestamp(),
      expires_at: Timestamp.fromDate(expiresAt),
      views: []
    };

    const docRef = await addDoc(collection(db, STATUSES_COLLECTION), statusData);

    return {
      id: docRef.id,
      ...statusData,
      created_at: new Date(),
      expires_at: expiresAt
    } as Status;
  } catch (error) {
    console.error('Error creating image status:', error);
    return null;
  }
};

// Get all active statuses for a user
export const getUserStatuses = async (userId: string): Promise<Status[]> => {
  try {
    const now = Timestamp.now();
    const statusesRef = collection(db, STATUSES_COLLECTION);

    // Query for user's non-expired statuses
    const q = query(
      statusesRef,
      where('user_id', '==', userId),
      where('expires_at', '>', now)
    );

    const snapshot = await getDocs(q);
    const statuses: Status[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      statuses.push({
        id: doc.id,
        user_id: data.user_id,
        content_type: data.content_type,
        content: data.content,
        background_color: data.background_color,
        created_at: data.created_at?.toDate() || new Date(),
        expires_at: data.expires_at?.toDate() || new Date(),
        views: data.views || []
      });
    });

    // Sort by created_at ascending
    return statuses.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  } catch (error) {
    console.error('Error getting user statuses:', error);
    return [];
  }
};

// Get all active statuses from all users (for feed)
export const getAllActiveStatuses = async (): Promise<StatusUser[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  try {
    const now = Timestamp.now();
    const statusesRef = collection(db, STATUSES_COLLECTION);

    // Query for all non-expired statuses
    const q = query(
      statusesRef,
      where('expires_at', '>', now)
    );

    const snapshot = await getDocs(q);

    // Group statuses by user
    const userStatusMap: Map<string, Status[]> = new Map();

    snapshot.forEach(doc => {
      const data = doc.data();
      const status: Status = {
        id: doc.id,
        user_id: data.user_id,
        content_type: data.content_type,
        content: data.content,
        background_color: data.background_color,
        created_at: data.created_at?.toDate() || new Date(),
        expires_at: data.expires_at?.toDate() || new Date(),
        views: data.views || []
      };

      const existing = userStatusMap.get(data.user_id) || [];
      existing.push(status);
      userStatusMap.set(data.user_id, existing);
    });

    // Get user profiles for each status owner
    const statusUsers: StatusUser[] = [];

    for (const [userId, statuses] of userStatusMap) {
      // Sort statuses by created_at
      statuses.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

      // Get user profile
      const profileRef = collection(db, 'profiles');
      const profileQuery = query(profileRef, where('id', '==', userId));
      const profileSnapshot = await getDocs(profileQuery);

      let username = 'Unknown User';
      let avatar_url = null;

      if (!profileSnapshot.empty) {
        const profileData = profileSnapshot.docs[0].data();
        username = profileData.username || profileData.full_name || 'Unknown User';
        avatar_url = profileData.avatarUrl || profileData.avatar_url || null;
      }

      // Check if current user has viewed all statuses
      const hasUnviewed = statuses.some(s => !s.views.includes(currentUser.uid));

      statusUsers.push({
        user_id: userId,
        username,
        avatar_url,
        statuses,
        hasUnviewed
      });
    }

    // Sort: current user first, then users with unviewed statuses, then by most recent status
    return statusUsers.sort((a, b) => {
      if (a.user_id === currentUser.uid) return -1;
      if (b.user_id === currentUser.uid) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      const aLatest = a.statuses[a.statuses.length - 1]?.created_at.getTime() || 0;
      const bLatest = b.statuses[b.statuses.length - 1]?.created_at.getTime() || 0;
      return bLatest - aLatest;
    });
  } catch (error) {
    console.error('Error getting all statuses:', error);
    return [];
  }
};

// Mark a status as viewed
export const markStatusViewed = async (statusId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const statusRef = doc(db, STATUSES_COLLECTION, statusId);

    const statusSnap = await getDoc(statusRef);
    if (statusSnap.exists()) {
      const data = statusSnap.data();
      if (!data.views?.includes(user.uid)) {
        await updateDoc(statusRef, {
          views: arrayUnion(user.uid)
        });
      }
    }
  } catch (error) {
    console.error('Error marking status as viewed:', error);
  }
};

// Delete a status
export const deleteStatus = async (statusId: string): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const statusRef = doc(db, STATUSES_COLLECTION, statusId);

    const statusSnap = await getDoc(statusRef);
    if (statusSnap.exists()) {
      const data = statusSnap.data();

      // Verify ownership
      if (data.user_id !== user.uid) return false;

      // Delete image from storage if it's an image status
      if (data.content_type === 'image' && data.content) {
        try {
          const imageRef = ref(storage, data.content);
          await deleteObject(imageRef);
        } catch (e) {
          // Image may already be deleted
        }
      }

      await deleteDoc(statusRef);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting status:', error);
    return false;
  }
};

// Cleanup expired statuses (can be called periodically)
export const cleanupExpiredStatuses = async (): Promise<void> => {
  try {
    const now = Timestamp.now();
    const statusesRef = collection(db, STATUSES_COLLECTION);

    const q = query(
      statusesRef,
      where('expires_at', '<', now)
    );

    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      // Delete image from storage if it's an image status
      if (data.content_type === 'image' && data.content) {
        try {
          const imageRef = ref(storage, data.content);
          await deleteObject(imageRef);
        } catch (e) {
          // Image may already be deleted
        }
      }

      await deleteDoc(doc(db, STATUSES_COLLECTION, docSnap.id));
    }
  } catch (error) {
    console.error('Error cleaning up expired statuses:', error);
  }
};
