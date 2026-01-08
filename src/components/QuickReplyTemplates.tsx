import { useState, useEffect } from 'react';
import { Zap, Plus, Edit2, Trash2, Copy, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

interface QuickReply {
  id: string;
  shortcut: string;
  content: string;
  category: string;
}

const DEFAULT_TEMPLATES: QuickReply[] = [
  { id: '1', shortcut: '/roger', content: 'Roger that, copy.', category: 'Tactical' },
  { id: '2', shortcut: '/wilco', content: 'Will comply.', category: 'Tactical' },
  { id: '3', shortcut: '/standby', content: 'Stand by for further instructions.', category: 'Tactical' },
  { id: '4', shortcut: '/negative', content: 'Negative, that is not possible.', category: 'Tactical' },
  { id: '5', shortcut: '/affirm', content: 'Affirmative.', category: 'Tactical' },
  { id: '6', shortcut: '/oscar', content: 'Oscar Mike (On the Move).', category: 'Tactical' },
  { id: '7', shortcut: '/sitrep', content: 'Requesting situation report.', category: 'Tactical' },
  { id: '8', shortcut: '/eta', content: 'What is your ETA?', category: 'Logistics' },
  { id: '9', shortcut: '/rtb', content: 'Returning to base.', category: 'Logistics' },
  { id: '10', shortcut: '/brb', content: 'Be right back.', category: 'General' },
  { id: '11', shortcut: '/omw', content: 'On my way.', category: 'General' },
  { id: '12', shortcut: '/ty', content: 'Thank you!', category: 'General' },
];

interface QuickReplyTemplatesProps {
  onSelect: (content: string) => void;
}

export const QuickReplyTemplates = ({ onSelect }: QuickReplyTemplatesProps) => {
  const [templates, setTemplates] = useState<QuickReply[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuickReply | null>(null);
  const [formData, setFormData] = useState({ shortcut: '', content: '', category: 'Custom' });

  useEffect(() => {
    // Load templates from localStorage or use defaults
    const saved = localStorage.getItem('quick_reply_templates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    } else {
      setTemplates(DEFAULT_TEMPLATES);
      localStorage.setItem('quick_reply_templates', JSON.stringify(DEFAULT_TEMPLATES));
    }
  }, []);

  const saveTemplates = (newTemplates: QuickReply[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('quick_reply_templates', JSON.stringify(newTemplates));
  };

  const addTemplate = () => {
    if (!formData.shortcut || !formData.content) {
      toast.error('Please fill in all fields');
      return;
    }

    const shortcut = formData.shortcut.startsWith('/') ? formData.shortcut : `/${formData.shortcut}`;

    if (templates.some(t => t.shortcut === shortcut && t.id !== editingTemplate?.id)) {
      toast.error('Shortcut already exists');
      return;
    }

    if (editingTemplate) {
      const updated = templates.map(t =>
        t.id === editingTemplate.id
          ? { ...t, shortcut, content: formData.content, category: formData.category }
          : t
      );
      saveTemplates(updated);
      toast.success('Template updated');
    } else {
      const newTemplate: QuickReply = {
        id: `custom_${Date.now()}`,
        shortcut,
        content: formData.content,
        category: formData.category,
      };
      saveTemplates([...templates, newTemplate]);
      toast.success('Template added');
    }

    setFormData({ shortcut: '', content: '', category: 'Custom' });
    setEditingTemplate(null);
  };

  const deleteTemplate = (id: string) => {
    saveTemplates(templates.filter(t => t.id !== id));
    toast.success('Template deleted');
  };

  const editTemplate = (template: QuickReply) => {
    setEditingTemplate(template);
    setFormData({
      shortcut: template.shortcut,
      content: template.content,
      category: template.category,
    });
  };

  const resetForm = () => {
    setFormData({ shortcut: '', content: '', category: 'Custom' });
    setEditingTemplate(null);
  };

  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-yellow-400"
        >
          <Zap className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-gray-800 border-gray-700" align="end">
        <div className="p-3 border-b border-gray-700 flex justify-between items-center">
          <h4 className="text-white font-medium">Quick Replies</h4>
          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Edit2 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Manage Quick Replies</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Add/Edit Form */}
                <div className="space-y-3 p-3 bg-gray-700/50 rounded-lg">
                  <Input
                    placeholder="Shortcut (e.g., /roger)"
                    value={formData.shortcut}
                    onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Textarea
                    placeholder="Reply content..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Input
                    placeholder="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <div className="flex gap-2">
                    <Button onClick={addTemplate} className="flex-1 bg-green-600 hover:bg-green-700">
                      {editingTemplate ? 'Update' : 'Add'} Template
                    </Button>
                    {editingTemplate && (
                      <Button onClick={resetForm} variant="outline" className="border-gray-600">
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Template List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-2 bg-gray-700/50 rounded"
                    >
                      <div className="min-w-0">
                        <p className="text-yellow-400 text-sm font-mono">{template.shortcut}</p>
                        <p className="text-gray-400 text-xs truncate">{template.content}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editTemplate(template)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTemplate(template.id)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Reply Categories */}
        <div className="max-h-64 overflow-y-auto">
          {categories.map((category) => (
            <div key={category}>
              <div className="px-3 py-1.5 bg-gray-750 text-gray-500 text-xs uppercase">
                {category}
              </div>
              {templates
                .filter((t) => t.category === category)
                .map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      onSelect(template.content);
                      toast.success(`Inserted: ${template.shortcut}`);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <span className="text-yellow-400 text-sm font-mono">{template.shortcut}</span>
                      <p className="text-gray-400 text-xs truncate">{template.content}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Hook to detect shortcuts in message input
export const useQuickReplyShortcut = () => {
  const [templates, setTemplates] = useState<QuickReply[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('quick_reply_templates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    } else {
      setTemplates(DEFAULT_TEMPLATES);
    }
  }, []);

  const expandShortcut = (text: string): string | null => {
    const template = templates.find(t => t.shortcut === text.trim());
    return template ? template.content : null;
  };

  return { expandShortcut, templates };
};

export default QuickReplyTemplates;
