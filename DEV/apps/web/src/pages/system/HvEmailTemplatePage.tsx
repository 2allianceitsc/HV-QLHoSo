import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Eye, Save, X } from 'lucide-react';
import { hvEmailTemplateApi, type IHvEmailTemplate } from '@/api/hvEmailTemplate.api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const VAR_LABELS: Record<string, string> = {
  '{code}':               'Mã tờ trình',
  '{title}':              'Tiêu đề',
  '{submitter.fullName}': 'Người trình',
  '{department}':         'Bộ phận',
  '{submittedDate}':      'Ngày gửi',
  '{link}':               'Link tờ trình',
  '{reviewer.fullName}':  'Người thẩm định',
  '{approver.fullName}':  'Người phê duyệt',
  '{reason}':             'Lý do từ chối',
  '{fullName}':           'Họ tên',
  '{username}':           'Tên đăng nhập',
  '{tempPassword}':       'Mật khẩu tạm',
  '{resetLink}':          'Link đặt lại mật khẩu',
};

function VariableChip({ variable }: { variable: string }) {
  const [copied, setCopied] = useState(false);
  const label = VAR_LABELS[variable] ?? variable;

  function handleClick() {
    void navigator.clipboard.writeText(variable);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleClick}
      title={variable}
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors cursor-pointer select-none',
        copied
          ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-950 dark:border-green-700 dark:text-green-400'
          : 'bg-muted hover:bg-accent border-border text-foreground',
      )}
    >
      {copied && <Check className="h-3 w-3 shrink-0" />}
      <span>{copied ? 'Đã copy!' : label}</span>
    </button>
  );
}

export function HvEmailTemplatePage() {
  const [activeId, setActiveId] = useState<string>('');
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({});
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['hv-email-templates'],
    queryFn: hvEmailTemplateApi.list,
  });

  useEffect(() => {
    if (templates.length > 0) {
      const init: Record<string, { subject: string; body: string }> = {};
      templates.forEach((t) => { init[t.eventId] = { subject: t.subject, body: t.body }; });
      setEdits(init);
      if (!activeId || !templates.find((t) => t.eventId === activeId)) {
        setActiveId(templates[0].eventId);
      }
    }
  }, [templates]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: ({ eventId, subject, body }: { eventId: string; subject: string; body: string }) =>
      hvEmailTemplateApi.update(eventId, { subject, body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hv-email-templates'] });
      toast({ title: 'Đã lưu template' });
    },
    onError: () => toast({ title: 'Lưu thất bại', variant: 'destructive' }),
  });

  const active = templates.find((t) => t.eventId === activeId);
  const editState = edits[activeId];

  function handleSave() {
    if (!active || !editState) return;
    saveMutation.mutate({ eventId: active.eventId, subject: editState.subject, body: editState.body });
  }

  function setField(field: 'subject' | 'body', value: string) {
    setEdits((prev) => ({ ...prev, [activeId]: { ...prev[activeId], [field]: value } }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cấu hình email template</h1>
        <p className="text-sm text-muted-foreground mt-1">Chỉnh sửa nội dung email cho từng sự kiện trong quy trình duyệt tờ trình</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Đang tải...</div>
      ) : (
        <div className="flex gap-6">
          {/* Left: event list */}
          <aside className="w-56 shrink-0 space-y-1">
            {templates.map((t) => (
              <button
                key={t.eventId}
                onClick={() => setActiveId(t.eventId)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors',
                  activeId === t.eventId
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted text-foreground',
                )}
              >
                <span className="font-mono text-xs opacity-70 block">{t.eventId}</span>
                <span className="line-clamp-2 leading-tight mt-0.5">{t.label}</span>
              </button>
            ))}
          </aside>

          {/* Right: editor */}
          {active && editState ? (
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{active.label}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{active.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setPreviewHtml(editState.body)}>
                    <Eye className="h-4 w-4 mr-1.5" />
                    Preview
                  </Button>
                  <Button size="sm" disabled={saveMutation.isPending} onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1.5" />
                    Lưu
                  </Button>
                </div>
              </div>

              {/* Variables */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-muted-foreground">Biến (nhấn để copy):</span>
                {active.variables.map((v) => (
                  <VariableChip key={v} variable={v} />
                ))}
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label>Tiêu đề email <span className="text-destructive">*</span></Label>
                <Input
                  value={editState.subject}
                  onChange={(e) => setField('subject', e.target.value)}
                  placeholder="Tiêu đề email..."
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <Label>Nội dung (HTML) <span className="text-destructive">*</span></Label>
                <textarea
                  value={editState.body}
                  onChange={(e) => setField('body', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ minHeight: 320 }}
                  spellCheck={false}
                  placeholder="<!-- Nhập HTML email... -->"
                />
                <p className="text-xs text-muted-foreground">
                  Dùng các biến trong danh sách ở trên. Hệ thống sẽ thay thế tự động khi gửi.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Preview modal */}
      {previewHtml !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <h2 className="font-semibold text-sm">Xem trước nội dung email</h2>
              <button onClick={() => setPreviewHtml(null)} className="p-1 rounded hover:bg-accent transition-colors">
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
