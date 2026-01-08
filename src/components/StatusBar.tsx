import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { auth } from '@/integrations/firebase/client';
import { getAllActiveStatuses, StatusUser } from '@/services/statusService';

interface StatusBarProps {
  onViewStatus: (statusUser: StatusUser) => void;
  onCreateStatus: () => void;
}

export const StatusBar = ({ onViewStatus, onCreateStatus }: StatusBarProps) => {
  const [statusUsers, setStatusUsers] = useState<StatusUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
    // Refresh statuses every 30 seconds
    const interval = setInterval(loadStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatuses = async () => {
    try {
      const statuses = await getAllActiveStatuses();
      setStatusUsers(statuses);
    } catch (error) {
      console.error('Error loading statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentUserId = auth.currentUser?.uid;
  const myStatus = statusUsers.find(s => s.user_id === currentUserId);
  const otherStatuses = statusUsers.filter(s => s.user_id !== currentUserId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 border-b border-gray-700/50">
        <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-3 px-2 border-b border-gray-700/50 bg-gray-800/50">
      <div className="flex items-center space-x-4 overflow-x-auto scrollbar-hide">
        {/* Add Status / My Status */}
        <div className="flex flex-col items-center flex-shrink-0">
          <button
            onClick={myStatus ? () => onViewStatus(myStatus) : onCreateStatus}
            className="relative"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
              myStatus
                ? 'bg-gradient-to-br from-green-500 to-green-600 ring-2 ring-green-400 ring-offset-2 ring-offset-gray-800'
                : 'bg-gray-700 border-2 border-dashed border-gray-500'
            }`}>
              {myStatus ? (
                myStatus.avatar_url ? (
                  <img src={myStatus.avatar_url} alt="My status" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {myStatus.username.charAt(0).toUpperCase()}
                  </span>
                )
              ) : (
                <Plus className="w-6 h-6 text-gray-400" />
              )}
            </div>
            {!myStatus && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-800">
                <Plus className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
          <span className="text-xs text-gray-400 mt-1.5 truncate max-w-[60px]">
            {myStatus ? 'My Status' : 'Add Status'}
          </span>
        </div>

        {/* Other Users' Statuses */}
        {otherStatuses.map((statusUser) => (
          <div key={statusUser.user_id} className="flex flex-col items-center flex-shrink-0">
            <button
              onClick={() => onViewStatus(statusUser)}
              className="relative"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                statusUser.hasUnviewed
                  ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-gray-800'
                  : 'ring-2 ring-gray-600 ring-offset-2 ring-offset-gray-800'
              } bg-gradient-to-br from-purple-500 to-purple-600`}>
                {statusUser.avatar_url ? (
                  <img
                    src={statusUser.avatar_url}
                    alt={statusUser.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {statusUser.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {statusUser.hasUnviewed && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </button>
            <span className="text-xs text-gray-400 mt-1.5 truncate max-w-[60px]">
              {statusUser.username}
            </span>
          </div>
        ))}

        {statusUsers.length === 0 && !myStatus && (
          <div className="text-gray-500 text-sm pl-2">
            No status updates yet
          </div>
        )}
      </div>
    </div>
  );
};
