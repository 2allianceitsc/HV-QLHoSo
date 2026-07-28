import { BookOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';
import { GUIDE_SECTIONS, GUIDE_TAB_LABELS, type GuideRole } from '@/config/guide.config';

function guideRolesForHvRoles(hvRoles: string[]): GuideRole[] {
  const roles: GuideRole[] = [];
  if (hvRoles.includes('staff')) roles.push('staff');
  if (hvRoles.includes('reviewer') || hvRoles.includes('approver')) roles.push('reviewer_approver');
  if (hvRoles.includes('admin')) roles.push('admin');
  return roles;
}

export function UserGuidePage() {
  const user = useAuthStore((s) => s.user);
  const guideRoles = guideRolesForHvRoles(user?.hvRoles ?? ['staff']);

  if (guideRoles.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-3 sm:p-6">
        <p className="text-sm text-muted-foreground">Chưa có nội dung hướng dẫn cho vai trò của bạn.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2.5">
        <BookOpen size={22} className="text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Hướng dẫn sử dụng</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hướng dẫn theo vai trò của bạn trong hệ thống.
          </p>
        </div>
      </div>

      {guideRoles.length === 1 ? (
        <GuideRoleContent role={guideRoles[0]} />
      ) : (
        <Tabs defaultValue={guideRoles[0]}>
          <TabsList>
            {guideRoles.map((role) => (
              <TabsTrigger key={role} value={role}>
                {GUIDE_TAB_LABELS[role]}
              </TabsTrigger>
            ))}
          </TabsList>
          {guideRoles.map((role) => (
            <TabsContent key={role} value={role}>
              <GuideRoleContent role={role} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function GuideRoleContent({ role }: { role: GuideRole }) {
  const sections = GUIDE_SECTIONS[role];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.id} className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">{section.title}</h2>
          <div className="space-y-5">
            {section.steps.map((step, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-semibold text-foreground mb-1">{step.heading}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                {step.image && (
                  <img
                    src={`/guide-assets/${step.image}`}
                    alt={step.heading}
                    className="mt-3 w-full rounded-md border border-border shadow-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
