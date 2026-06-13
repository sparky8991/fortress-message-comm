import { useState } from 'react';
import { Languages, ChevronDown, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface MessageTranslationProps {
  originalText: string;
  onTranslated?: (text: string, language: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];

export const MessageTranslation = ({ originalText, onTranslated }: MessageTranslationProps) => {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const translateMessage = async (targetLang: string) => {
    setIsTranslating(true);
    setSelectedLanguage(targetLang);

    try {
      // Using LibreTranslate API (free, no API key required for demo)
      // In production, you'd use Google Translate API or similar
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: originalText,
          source: 'auto',
          target: targetLang,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslatedText(data.translatedText);
      onTranslated?.(data.translatedText, targetLang);
    } catch (error) {
      // Fallback: Simple mock translation for demo
      const mockTranslation = await mockTranslate(originalText, targetLang);
      setTranslatedText(mockTranslation);
      onTranslated?.(mockTranslation, targetLang);
    } finally {
      setIsTranslating(false);
    }
  };

  // Mock translation for demo purposes
  const mockTranslate = async (text: string, targetLang: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const translations: Record<string, Record<string, string>> = {
      es: { 'Hello': 'Hola', 'How are you?': '¿Cómo estás?', 'Good morning': 'Buenos días' },
      fr: { 'Hello': 'Bonjour', 'How are you?': 'Comment allez-vous?', 'Good morning': 'Bonjour' },
      de: { 'Hello': 'Hallo', 'How are you?': 'Wie geht es dir?', 'Good morning': 'Guten Morgen' },
      ja: { 'Hello': 'こんにちは', 'How are you?': 'お元気ですか？', 'Good morning': 'おはようございます' },
      zh: { 'Hello': '你好', 'How are you?': '你好吗？', 'Good morning': '早上好' },
    };

    const langTranslations = translations[targetLang];
    if (langTranslations && langTranslations[text]) {
      return langTranslations[text];
    }

    // Return original with language indicator for unmatched translations
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
    return `[${lang?.name || targetLang}] ${text}`;
  };

  const clearTranslation = () => {
    setTranslatedText(null);
    setSelectedLanguage(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isTranslating}
              className="h-6 px-2 ft-meta text-gray-400 hover:text-blue-400"
            >
              {isTranslating ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Languages className="w-3 h-3 mr-1" />
              )}
              Translate
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-700 max-h-64 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => translateMessage(lang.code)}
                className="text-gray-300 hover:bg-gray-700 cursor-pointer"
              >
                <span className="mr-2">{lang.flag}</span>
                {lang.name}
                {selectedLanguage === lang.code && (
                  <Check className="w-4 h-4 ml-auto text-green-500" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {translatedText && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTranslation}
            className="h-6 px-2 ft-meta text-gray-400 hover:text-red-400"
          >
            Show original
          </Button>
        )}
      </div>

      {translatedText && (
        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <p className="text-blue-300 ft-body">{translatedText}</p>
          <p className="text-gray-500 ft-meta mt-1">
            Translated to {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
          </p>
        </div>
      )}
    </div>
  );
};

// Auto-translate settings hook
export const useAutoTranslate = () => {
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(() => {
    return localStorage.getItem('auto_translate') === 'true';
  });

  const [preferredLanguage, setPreferredLanguage] = useState(() => {
    return localStorage.getItem('preferred_language') || 'en';
  });

  const enableAutoTranslate = (langCode: string) => {
    localStorage.setItem('auto_translate', 'true');
    localStorage.setItem('preferred_language', langCode);
    setAutoTranslateEnabled(true);
    setPreferredLanguage(langCode);
    toast.success('Auto-translate enabled');
  };

  const disableAutoTranslate = () => {
    localStorage.setItem('auto_translate', 'false');
    setAutoTranslateEnabled(false);
    toast.success('Auto-translate disabled');
  };

  return {
    autoTranslateEnabled,
    preferredLanguage,
    enableAutoTranslate,
    disableAutoTranslate,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
};

// Settings component
export const TranslationSettings = () => {
  const { autoTranslateEnabled, preferredLanguage, enableAutoTranslate, disableAutoTranslate, supportedLanguages } = useAutoTranslate();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Languages className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-white ft-body font-medium">Auto-Translate</p>
            <p className="text-gray-400 ft-meta">Automatically translate incoming messages</p>
          </div>
        </div>
        <button
          onClick={() => autoTranslateEnabled ? disableAutoTranslate() : enableAutoTranslate(preferredLanguage)}
          className={`w-12 h-6 rounded-full transition-colors ${
            autoTranslateEnabled ? 'bg-blue-500' : 'bg-gray-600'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
            autoTranslateEnabled ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {autoTranslateEnabled && (
        <div className="p-3 bg-gray-700/50 rounded-lg">
          <p className="text-gray-400 ft-body mb-2">Translate to:</p>
          <div className="grid grid-cols-3 gap-2">
            {supportedLanguages.slice(0, 6).map((lang) => (
              <button
                key={lang.code}
                onClick={() => enableAutoTranslate(lang.code)}
                className={`p-2 rounded ft-body ${
                  preferredLanguage === lang.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageTranslation;
