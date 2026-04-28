import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Eye, Save, X } from 'lucide-react';
import { getEmailTemplates, updateEmailTemplate } from '@/api/email.api';
import { toast } from '@/hooks/use-toast';
import { useTabState } from '@/hooks/useTabState';

export function EmailTemplatePage() {
  const [activeTab, setActiveTab] = useTabState<string>('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: getEmailTemplates,
  });

  // Populate editor state when templates first load
  useEffect(() => {
    if (templates && templates.length > 0) {
      const initial: Record<string, string> = {};
      templates.forEach((t) => { initial[t.type] = t.html; });
      setEditedContent(initial);
      const activeTabExists = templates.some((template) => template.type === activeTab);
      if (!activeTabExists) setActiveTab(templates[0].type);
    }
  }, [activeTab, setActiveTab, templates]);

  const saveMutation = useMutation({
    mutationFn: ({ type, html }: { type: string; html: string }) =>
      updateEmailTemplate(type, html),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: 'Template saved' });
    },
    onError: () => {
      toast({ title: 'Failed to save template', variant: 'destructive' });
    },
  });

  const activeTemplate = templates?.find((t) => t.type === activeTab);

  function handleSave() {
    if (!activeTab || editedContent[activeTab] === undefined) return;
    saveMutation.mutate({ type: activeTab, html: editedContent[activeTab] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <p className="text-sm text-muted-foreground">Edit HTML for each transactional email type</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading templates…</div>
      ) : !templates?.length ? (
        <div className="py-12 text-center text-muted-foreground">No templates found.</div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            {templates.map((t) => (
              <button
                key={t.type}
                onClick={() => setActiveTab(t.type)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === t.type
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.key}
              </button>
            ))}
          </div>

          {/* Editor panel */}
          {activeTemplate && (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{activeTemplate.key}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activeTemplate.description}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewHtml(editedContent[activeTab] ?? '')}
                  >
                    <Eye className="h-4 w-4 mr-1.5" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    disabled={saveMutation.isPending}
                    onClick={handleSave}
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    Save
                  </Button>
                </div>
              </div>

              <textarea
                value={editedContent[activeTab] ?? ''}
                onChange={(e) =>
                  setEditedContent((prev) => ({ ...prev, [activeTab]: e.target.value }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ minHeight: 360 }}
                spellCheck={false}
                placeholder="<!-- Paste your HTML template here -->"
              />

              <p className="text-xs text-muted-foreground">
                Available placeholders depend on template type — refer to backend docs for variable names.
              </p>
            </div>
          )}
        </>
      )}

      {/* Preview modal */}
      {previewHtml !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
              <h2 className="font-semibold text-sm">HTML Preview</h2>
              <button
                onClick={() => setPreviewHtml(null)}
                className="p-1 rounded hover:bg-accent transition-colors"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={previewHtml}
                title="Email preview"
                className="w-full h-full border-0"
                style={{ minHeight: 500 }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
