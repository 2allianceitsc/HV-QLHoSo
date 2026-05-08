import { format } from 'date-fns';
import type { ISubmissionLog } from '@/api/submission.api';

const ACTION_LABEL: Record<string, string> = {
  create:  'Tạo tờ trình',
  edit:    'Chỉnh sửa',
  submit:  'Gửi tờ trình',
  review:  'Thẩm định',
  approve: 'Phê duyệt',
  reject:  'Từ chối',
};

function fullName(user: { firstName: string; middleName?: string | null; surname: string }) {
  return [user.firstName, user.middleName, user.surname].filter(Boolean).join(' ');
}

export function WorkflowTimeline({ logs }: { logs: ISubmissionLog[] }) {
  if (!logs.length) return <p className="text-sm text-muted-foreground">Chưa có lịch sử.</p>;

  return (
    <ol className="relative border-l border-gray-200 space-y-6 ml-3">
      {logs.map((log) => (
        <li key={log.id} className="ml-6">
          <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 text-xs ${log.action === 'approve' || log.action === 'review' ? 'border-green-500 text-green-600' : 'border-gray-300'}`}>
            {log.action === 'approve' || log.action === 'review' ? '✓' : log.action === 'reject' ? '✗' : '·'}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{ACTION_LABEL[log.action] ?? log.action}</span>
            <span className="text-xs text-muted-foreground">
              <span className={log.action === 'approve' || log.action === 'review' ? 'text-green-600' : ''}>{fullName(log.user)}</span>
              {' · '}{format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm')}
            </span>
            {log.note && <span className="text-xs text-destructive mt-0.5">Lý do: {log.note}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}
