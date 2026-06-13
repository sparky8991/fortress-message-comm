import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react';
import { auth } from '@/integrations/firebase/client';
import { StatusUser, Status, markStatusViewed, deleteStatus } from '@/services/statusService';
import { formatDistanceToNow } from 'date-fns';

interface StatusViewerProps {
  statusUser: StatusUser | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export const StatusViewer = ({ statusUser, onClose, onDeleted }: StatusViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentStatus = statusUser?.statuses[currentIndex];
  const isOwnStatus = statusUser?.user_id === auth.currentUser?.uid;
  const totalStatuses = statusUser?.statuses.length || 0;

  // Mark status as viewed
  useEffect(() => {
    if (currentStatus && !isOwnStatus) {
      markStatusViewed(currentStatus.id);
    }
  }, [currentStatus, isOwnStatus]);

  // Progress timer
  useEffect(() => {
    if (!statusUser || isPaused) return;

    const duration = 5000; // 5 seconds per status
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Move to next status or close
          if (currentIndex < totalStatuses - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, totalStatuses, isPaused, statusUser, onClose]);

  // Reset progress when changing status
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < totalStatuses - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, totalStatuses, onClose]);

  const handleDelete = async () => {
    if (!currentStatus || !isOwnStatus) return;

    const success = await deleteStatus(currentStatus.id);
    if (success) {
      if (totalStatuses === 1) {
        onClose();
      } else if (currentIndex >= totalStatuses - 1) {
        setCurrentIndex(currentIndex - 1);
      }
      if (onDeleted) onDeleted();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, onClose]);

  if (!statusUser || !currentStatus) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Progress bars */}
      <div className="flex space-x-1 p-2 pt-4">
        {statusUser.statuses.map((_, index) => (
          <div key={index} className="flex-1 h-0.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            {statusUser.avatar_url ? (
              <img
                src={statusUser.avatar_url}
                alt={statusUser.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-bold">
                {statusUser.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-white font-medium">{statusUser.username}</p>
            <p className="text-gray-400 ft-meta">
              {formatDistanceToNow(currentStatus.created_at, { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isOwnStatus && (
            <>
              <div className="flex items-center space-x-1 text-gray-400 ft-body mr-2">
                <Eye className="w-4 h-4" />
                <span>{currentStatus.views.length}</span>
              </div>
              <button
                onClick={handleDelete}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors"
                title="Delete status"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Status content */}
      <div
        className="flex-1 flex items-center justify-center relative"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Navigation areas */}
        <button
          onClick={goToPrevious}
          className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>

        <button
          onClick={goToNext}
          className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>

        {/* Content */}
        {currentStatus.content_type === 'image' ? (
          <img
            src={currentStatus.content}
            alt="Status"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: currentStatus.background_color || '#1f2937' }}
          >
            <p className="text-white text-2xl md:text-4xl font-medium text-center leading-relaxed">
              {currentStatus.content}
            </p>
          </div>
        )}
      </div>

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-4">
            <span className="text-white ft-head">Paused</span>
          </div>
        </div>
      )}
    </div>
  );
};
