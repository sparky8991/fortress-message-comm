import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Palette, Square, MessageSquare, Type, Check } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ThemeSettings } from '@/services/userSettingsService';

interface ThemeSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCENT_COLORS = [
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
];

const BUBBLE_STYLES = [
  { name: 'Rounded', value: 'rounded', description: 'Soft rounded corners' },
  { name: 'Square', value: 'square', description: 'Sharp corners' },
  { name: 'Minimal', value: 'minimal', description: 'No background, subtle' },
];

const CHAT_BACKGROUNDS = [
  { name: 'Default', value: 'default', color: '#111827' },
  { name: 'Darker', value: 'darker', color: '#0a0a0a' },
  { name: 'Navy', value: 'navy', color: '#0c1929' },
  { name: 'Purple', value: 'purple', color: '#1a0a29' },
  { name: 'Forest', value: 'forest', color: '#0a1f0a' },
];

const FONT_STYLES = [
  { name: 'Monospace', value: 'mono', family: 'font-mono' },
  { name: 'Sans Serif', value: 'sans', family: 'font-sans' },
  { name: 'Serif', value: 'serif', family: 'font-serif' },
];

export const ThemeSettingsDialog = ({ isOpen, onClose }: ThemeSettingsDialogProps) => {
  const { settings, updateThemeSettings } = useUserSettings();
  const [localSettings, setLocalSettings] = useState<ThemeSettings>({
    accentColor: '#22c55e',
    bubbleStyle: 'rounded',
    chatBackground: 'default',
    fontStyle: 'mono'
  });

  useEffect(() => {
    if (settings?.theme_settings) {
      setLocalSettings(settings.theme_settings);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateThemeSettings(localSettings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#06100b] border-green-500/20 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-purple-400 font-mono">
            <Palette className="w-5 h-5" />
            <span>Terminal Theme</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Accent Color */}
          <div className="space-y-3">
            <Label className="text-white font-medium flex items-center space-x-2">
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Accent Color</span>
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setLocalSettings({ ...localSettings, accentColor: color.value })}
                  className={`h-10 rounded transition-all relative ${
                    localSettings.accentColor === color.value
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {localSettings.accentColor === color.value && (
                    <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bubble Style */}
          <div className="space-y-3">
            <Label className="text-white font-medium flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Chat Bubble Style</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {BUBBLE_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setLocalSettings({ ...localSettings, bubbleStyle: style.value as ThemeSettings['bubbleStyle'] })}
                  className={`p-3 rounded border transition-all ${
                    localSettings.bubbleStyle === style.value
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  }`}
                >
                  <div
                    className={`w-full h-6 mb-2 ${
                      style.value === 'rounded' ? 'rounded-xl' :
                      style.value === 'square' ? 'rounded-sm' :
                      'rounded-lg border border-dashed border-gray-500'
                    }`}
                    style={{
                      backgroundColor: style.value === 'minimal' ? 'transparent' : localSettings.accentColor
                    }}
                  />
                  <p className="text-xs text-white font-medium">{style.name}</p>
                  <p className="text-xs text-gray-400">{style.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Background */}
          <div className="space-y-3">
            <Label className="text-white font-medium flex items-center space-x-2">
              <Square className="w-4 h-4 text-blue-400" />
              <span>Chat Background</span>
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {CHAT_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => setLocalSettings({ ...localSettings, chatBackground: bg.value })}
                  className={`h-16 rounded transition-all relative ${
                    localSettings.chatBackground === bg.value
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800'
                      : 'hover:opacity-80'
                  }`}
                  style={{ backgroundColor: bg.color }}
                  title={bg.name}
                >
                  {localSettings.chatBackground === bg.value && (
                    <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Font Style */}
          <div className="space-y-3">
            <Label className="text-white font-medium flex items-center space-x-2">
              <Type className="w-4 h-4 text-green-400" />
              <span>Font Style</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {FONT_STYLES.map((font) => (
                <button
                  key={font.value}
                  onClick={() => setLocalSettings({ ...localSettings, fontStyle: font.value as ThemeSettings['fontStyle'] })}
                  className={`p-3 rounded border transition-all ${
                    localSettings.fontStyle === font.value
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  }`}
                >
                  <p className={`text-sm text-white font-medium ${font.family}`}>
                    {font.name}
                  </p>
                  <p className={`text-xs text-gray-400 ${font.family}`}>
                    Aa Bb Cc
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <Label className="text-white font-medium">Preview</Label>
            <div
              className="p-4 rounded border border-green-500/15"
              style={{
                backgroundColor: CHAT_BACKGROUNDS.find(bg => bg.value === localSettings.chatBackground)?.color || '#111827'
              }}
            >
              <div className="space-y-2">
                <div className="flex justify-start">
                  <div
                    className={`px-3 py-2 max-w-[70%] ${
                      localSettings.bubbleStyle === 'rounded' ? 'rounded-xl' :
                      localSettings.bubbleStyle === 'square' ? 'rounded-sm' :
                      'bg-transparent border border-gray-600'
                    } ${localSettings.fontStyle === 'mono' ? 'font-mono' : localSettings.fontStyle === 'serif' ? 'font-serif' : 'font-sans'}`}
                    style={{
                      backgroundColor: localSettings.bubbleStyle === 'minimal' ? 'transparent' : '#374151'
                    }}
                  >
                    <p className="text-sm text-gray-100">Hey, how are you?</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div
                    className={`px-3 py-2 max-w-[70%] ${
                      localSettings.bubbleStyle === 'rounded' ? 'rounded-xl' :
                      localSettings.bubbleStyle === 'square' ? 'rounded-sm' :
                      'bg-transparent border'
                    } ${localSettings.fontStyle === 'mono' ? 'font-mono' : localSettings.fontStyle === 'serif' ? 'font-serif' : 'font-sans'}`}
                    style={{
                      backgroundColor: localSettings.bubbleStyle === 'minimal' ? 'transparent' : localSettings.accentColor + '40',
                      borderColor: localSettings.bubbleStyle === 'minimal' ? localSettings.accentColor : 'transparent',
                      color: localSettings.accentColor
                    }}
                  >
                    <p className="text-sm">I'm doing great!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-green-500/15">
          <Button variant="ghost" onClick={onClose} className="text-gray-300 hover:text-white hover:bg-green-500/10">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white">
            Save Theme
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
