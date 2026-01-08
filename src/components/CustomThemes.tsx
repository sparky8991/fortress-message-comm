import { useState, useEffect, createContext, useContext } from 'react';
import { Palette, Check, Moon, Sun, Leaf, Skull, Flame, Snowflake, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Theme {
  id: string;
  name: string;
  icon: React.ReactNode;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  cssVars: Record<string, string>;
}

const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default Dark',
    icon: <Moon className="w-4 h-4" />,
    colors: {
      primary: '#22c55e',
      secondary: '#3b82f6',
      background: '#111827',
      surface: '#1f2937',
      text: '#ffffff',
      accent: '#10b981',
    },
    cssVars: {
      '--theme-primary': '142 76% 36%',
      '--theme-secondary': '217 91% 60%',
      '--theme-background': '221 39% 11%',
      '--theme-surface': '215 28% 17%',
    },
  },
  {
    id: 'military-camo',
    name: 'Military Camo',
    icon: <Shield className="w-4 h-4" />,
    colors: {
      primary: '#4d7c0f',
      secondary: '#854d0e',
      background: '#1a1c14',
      surface: '#2d3325',
      text: '#d4d4aa',
      accent: '#65a30d',
    },
    cssVars: {
      '--theme-primary': '85 75% 27%',
      '--theme-secondary': '35 81% 29%',
      '--theme-background': '75 15% 9%',
      '--theme-surface': '85 17% 17%',
    },
  },
  {
    id: 'night-ops',
    name: 'Night Ops',
    icon: <Skull className="w-4 h-4" />,
    colors: {
      primary: '#dc2626',
      secondary: '#7c2d12',
      background: '#0a0a0a',
      surface: '#171717',
      text: '#fafafa',
      accent: '#ef4444',
    },
    cssVars: {
      '--theme-primary': '0 72% 51%',
      '--theme-secondary': '15 75% 28%',
      '--theme-background': '0 0% 4%',
      '--theme-surface': '0 0% 9%',
    },
  },
  {
    id: 'desert-storm',
    name: 'Desert Storm',
    icon: <Sun className="w-4 h-4" />,
    colors: {
      primary: '#d97706',
      secondary: '#92400e',
      background: '#1c1917',
      surface: '#292524',
      text: '#fef3c7',
      accent: '#f59e0b',
    },
    cssVars: {
      '--theme-primary': '32 95% 44%',
      '--theme-secondary': '28 79% 31%',
      '--theme-background': '20 14% 10%',
      '--theme-surface': '20 14% 15%',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    icon: <Snowflake className="w-4 h-4" />,
    colors: {
      primary: '#0ea5e9',
      secondary: '#0369a1',
      background: '#0c1929',
      surface: '#1e3a5f',
      text: '#e0f2fe',
      accent: '#38bdf8',
    },
    cssVars: {
      '--theme-primary': '199 89% 48%',
      '--theme-secondary': '201 90% 32%',
      '--theme-background': '213 52% 10%',
      '--theme-surface': '211 52% 25%',
    },
  },
  {
    id: 'jungle',
    name: 'Jungle',
    icon: <Leaf className="w-4 h-4" />,
    colors: {
      primary: '#16a34a',
      secondary: '#15803d',
      background: '#0a1f0a',
      surface: '#14351e',
      text: '#bbf7d0',
      accent: '#22c55e',
    },
    cssVars: {
      '--theme-primary': '142 72% 29%',
      '--theme-secondary': '142 64% 24%',
      '--theme-background': '120 50% 8%',
      '--theme-surface': '141 41% 15%',
    },
  },
  {
    id: 'inferno',
    name: 'Inferno',
    icon: <Flame className="w-4 h-4" />,
    colors: {
      primary: '#ea580c',
      secondary: '#9a3412',
      background: '#1a0a0a',
      surface: '#2a1515',
      text: '#fed7aa',
      accent: '#f97316',
    },
    cssVars: {
      '--theme-primary': '21 90% 48%',
      '--theme-secondary': '17 74% 34%',
      '--theme-background': '0 40% 7%',
      '--theme-surface': '0 30% 12%',
    },
  },
  {
    id: 'stealth',
    name: 'Stealth',
    icon: <Moon className="w-4 h-4" />,
    colors: {
      primary: '#6366f1',
      secondary: '#4f46e5',
      background: '#030712',
      surface: '#111827',
      text: '#c7d2fe',
      accent: '#818cf8',
    },
    cssVars: {
      '--theme-primary': '239 84% 67%',
      '--theme-secondary': '239 84% 59%',
      '--theme-background': '222 84% 5%',
      '--theme-surface': '221 39% 11%',
    },
  },
];

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);

  useEffect(() => {
    const savedThemeId = localStorage.getItem('app_theme');
    if (savedThemeId) {
      const theme = THEMES.find(t => t.id === savedThemeId);
      if (theme) {
        setCurrentTheme(theme);
        applyTheme(theme);
      }
    }
  }, []);

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;

    // Apply CSS variables
    Object.entries(theme.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply color scheme
    root.style.setProperty('--primary-color', theme.colors.primary);
    root.style.setProperty('--secondary-color', theme.colors.secondary);
    root.style.setProperty('--background-color', theme.colors.background);
    root.style.setProperty('--surface-color', theme.colors.surface);
    root.style.setProperty('--text-color', theme.colors.text);
    root.style.setProperty('--accent-color', theme.colors.accent);

    // Update body background
    document.body.style.backgroundColor = theme.colors.background;
  };

  const setTheme = (themeId: string) => {
    const theme = THEMES.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      applyTheme(theme);
      localStorage.setItem('app_theme', themeId);
      toast.success(`Theme changed to ${theme.name}`);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const CustomThemes = () => {
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'default';
  });

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;

    Object.entries(theme.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    root.style.setProperty('--primary-color', theme.colors.primary);
    root.style.setProperty('--secondary-color', theme.colors.secondary);
    root.style.setProperty('--background-color', theme.colors.background);
    root.style.setProperty('--surface-color', theme.colors.surface);
    root.style.setProperty('--text-color', theme.colors.text);
    root.style.setProperty('--accent-color', theme.colors.accent);

    document.body.style.backgroundColor = theme.colors.background;
  };

  const selectTheme = (themeId: string) => {
    const theme = THEMES.find(t => t.id === themeId);
    if (theme) {
      setSelectedTheme(themeId);
      applyTheme(theme);
      localStorage.setItem('app_theme', themeId);
      toast.success(`Theme changed to ${theme.name}`);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-500" />
          Custom Themes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => selectTheme(theme.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedTheme === theme.id
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ color: theme.colors.primary }}>{theme.icon}</span>
                  <span className="text-white text-sm font-medium">{theme.name}</span>
                </div>
                {selectedTheme === theme.id && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </div>
              {/* Color Preview */}
              <div className="flex gap-1">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.colors.primary }}
                  title="Primary"
                />
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.colors.secondary }}
                  title="Secondary"
                />
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.colors.surface }}
                  title="Surface"
                />
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.colors.accent }}
                  title="Accent"
                />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomThemes;
