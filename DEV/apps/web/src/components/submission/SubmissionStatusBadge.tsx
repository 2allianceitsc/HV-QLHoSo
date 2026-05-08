import { useQuery } from '@tanstack/react-query';
import { submissionApi } from '@/api/submission.api';
import type { SubmissionStatus } from '@/api/submission.api';

const FALLBACK: Record<SubmissionStatus, { label: string; textColor: string; bgColor: string }> = {
  draft:          { label: 'Nháp',           textColor: '#6B7280', bgColor: '#F3F4F6' },
  pending_review: { label: 'Chờ thẩm định',  textColor: '#92400E', bgColor: '#FEF3C7' },
  in_review:      { label: 'Chờ phê duyệt',  textColor: '#1E40AF', bgColor: '#DBEAFE' },
  approved:       { label: 'Đã phê duyệt',   textColor: '#065F46', bgColor: '#D1FAE5' },
  rejected:       { label: 'Từ chối',        textColor: '#991B1B', bgColor: '#FEE2E2' },
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const { data: catalog = [] } = useQuery({
    queryKey: ['submission-status-catalog'],
    queryFn: submissionApi.statusCatalog,
    staleTime: Infinity,
  });

  const catalogItem = catalog.find((s) => s.code === status);

  if (catalogItem) {
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
        style={{ backgroundColor: catalogItem.colorHex }}
      >
        {catalogItem.label}
      </span>
    );
  }

  const fb = FALLBACK[status] ?? { label: status, textColor: '#374151', bgColor: '#E5E7EB' };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ color: fb.textColor, backgroundColor: fb.bgColor }}
    >
      {fb.label}
    </span>
  );
}
