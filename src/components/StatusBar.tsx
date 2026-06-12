import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { auth } from '@/integrations/firebase/client';
import { getAllActiveStatuses, StatusUser } from '@/services/statusService';

interface StatusBarProps {
  onViewStatus: (statusUser: StatusUser) => void;
  onCreateStatus: () => void;
  variant?: 'top' | 'sidebar';
}

export const StatusBar = ({ onViewStatus, onCreateStatus, variant = 'top' }: StatusBarProps) => {
  const [statusUsers, setStatusUsers] = useState<StatusUser[]>([]);
  const [loading, setLoading] = useState(true);
  const isSidebar = variant === 'sidebar';

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
      <div className={`${isSidebar ? 'px-3 py-2' : 'py-4'} flex items-center justify-center border-b border-gray-800`}>
        <Loader2 className={`${isSidebar ? 'w-4 h-4' : 'w-5 h-5'} text-green-400 animate-spin`} />
      </div>
    );
  }

  return (
    <div className={`${isSidebar ? 'px-3 py-2 bg-gray-900' : 'py-3 px-2 bg-gray-800/50'} border-b border-gray-800`}>
      <div className={`flex items-center ${isSidebar ? 'space-x-3' : 'space-x-4'} overflow-x-auto scrollbar-hide`}>
        {/* Add Status / My Status */}
        <div className="flex flex-col items-center flex-shrink-0">
          <button
            onClick={myStatus ? () => onViewStatus(myStatus) : onCreateStatus}
            className="relative"
          >
            <div className={`${isSidebar ? 'w-10 h-10' : 'w-14 h-14'} rounded-full flex items-center justify-center ${
              myStatus
                ? 'bg-gradient-to-br from-green-500 to-green-600 ring-2 ring-green-400 ring-offset-2 ring-offset-gray-800'
                : 'bg-gray-700 border-2 border-dashed border-gray-500'
            }`}>
              {myStatus ? (
                myStatus.avatar_url ? (
                  <img src={myStatus.avatar_url} alt="My status" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className={`text-white font-bold ${isSidebar ? 'text-sm' : 'text-lg'}`}>
                    {myStatus.username.charAt(0).toUpperCase()}
                  </span>
                )
              ) : (
                <Plus className={`${isSidebar ? 'w-5 h-5' : 'w-6 h-6'} text-gray-400`} />
              )}
            </div>
            {!myStatus && (
              <div className={`${isSidebar ? 'w-4 h-4' : 'w-5 h-5'} absolute -bottom-1 -right-1 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-800`}>
                <Plus className={`${isSidebar ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-white`} />
              </div>
            )}
          </button>
          <span className={`${isSidebar ? 'text-[10px] max-w-[48px]' : 'text-xs max-w-[60px]'} text-gray-400 mt-1.5 truncate`}>
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
              <div className={`${isSidebar ? 'w-10 h-10' : 'w-14 h-14'} rounded-full flex items-center justify-center ${
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
                  <span className={`text-white font-bold ${isSidebar ? 'text-sm' : 'text-lg'}`}>
                    {statusUser.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {statusUser.hasUnviewed && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </button>
            <span className={`${isSidebar ? 'text-[10px] max-w-[48px]' : 'text-xs max-w-[60px]'} text-gray-400 mt-1.5 truncate`}>
              {statusUser.username}
            </span>
          </div>
        ))}

        {statusUsers.length === 0 && !myStatus && (
          <div className={`${isSidebar ? 'text-xs' : 'text-sm'} text-gray-500 pl-1`}>
            No status updates yet
          </div>
        )}
      </div>
    </div>
  );
};
