import { PermissionsService, UserPermissionPayload } from './permissions.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePayload(overrides: Partial<UserPermissionPayload> = {}): UserPermissionPayload {
  return {
    userId: 'user-1',
    roles: ['HR_ADMIN'],
    isSuperAdmin: false,
    permissions: [],
    generatedAt: new Date().toISOString(),
    ttlSeconds: 60,
    ...overrides,
  };
}

// ─── Suite: PermissionsService.check (static resolver) ────────────────────────

describe('PermissionsService.check', () => {
  // 1. SUPER_ADMIN bypass

  it('allows everything for SUPER_ADMIN regardless of rules', () => {
    const payload = makePayload({ isSuperAdmin: true, permissions: [] });
    expect(PermissionsService.check(payload, 'E04', 'roles', 'VIEW')).toBe('ALLOW');
    expect(PermissionsService.check(payload, 'SY99', null, 'DELETE')).toBe('ALLOW');
  });

  // 2. Default-deny

  it('denies when no rule exists for the screen', () => {
    const payload = makePayload({ permissions: [] });
    expect(PermissionsService.check(payload, 'E04', null, 'VIEW')).toBe('DENY');
  });

  it('denies when the screen has rules but action is missing', () => {
    const payload = makePayload({
      permissions: [{ screen: 'E04', tab: null, actions: ['VIEW'], denied: [] }],
    });
    expect(PermissionsService.check(payload, 'E04', null, 'UPDATE')).toBe('DENY');
  });

  // 3. Basic allow at screen level

  it('allows when the screen-level rule grants the action', () => {
    const payload = makePayload({
      permissions: [{ screen: 'E04', tab: null, actions: ['VIEW', 'UPDATE'], denied: [] }],
    });
    expect(PermissionsService.check(payload, 'E04', null, 'VIEW')).toBe('ALLOW');
    expect(PermissionsService.check(payload, 'E04', null, 'UPDATE')).toBe('ALLOW');
    expect(PermissionsService.check(payload, 'E04', null, 'DELETE')).toBe('DENY');
  });

  // 4. Tab-over-screen specificity

  it('uses tab-level rule when tab entry exists, ignoring screen rule', () => {
    const payload = makePayload({
      permissions: [
        { screen: 'E04', tab: null,    actions: ['VIEW', 'UPDATE'], denied: [] },
        { screen: 'E04', tab: 'roles', actions: ['VIEW'],           denied: [] }, // no UPDATE
      ],
    });
    // Tab entry wins — UPDATE is not in tab's actions → DENY
    expect(PermissionsService.check(payload, 'E04', 'roles', 'UPDATE')).toBe('DENY');
    // Screen rule still governs the whole-screen query
    expect(PermissionsService.check(payload, 'E04', null, 'UPDATE')).toBe('ALLOW');
    // For a tab WITHOUT a specific rule, fall back to the screen-level rule
    expect(PermissionsService.check(payload, 'E04', 'personal', 'VIEW')).toBe('ALLOW');
  });

  it('falls back to DENY when tab has no rule and screen has no matching rule either', () => {
    const payload = makePayload({
      permissions: [
        { screen: 'E04', tab: 'roles', actions: ['VIEW'], denied: [] }, // only a tab rule, no screen rule
      ],
    });
    expect(PermissionsService.check(payload, 'E04', 'personal', 'VIEW')).toBe('DENY');
  });

  it('tab rule can allow an action that the screen rule does not', () => {
    const payload = makePayload({
      permissions: [
        { screen: 'E04', tab: null,    actions: ['VIEW'],          denied: [] },
        { screen: 'E04', tab: 'roles', actions: ['VIEW', 'UPDATE'], denied: [] },
      ],
    });
    expect(PermissionsService.check(payload, 'E04', 'roles', 'UPDATE')).toBe('ALLOW');
  });

  // 5. Deny-override

  it('denies when deny is set on tab level even if screen allows', () => {
    const payload = makePayload({
      permissions: [
        { screen: 'E04', tab: null,       actions: ['VIEW'], denied: [] },
        { screen: 'E04', tab: 'security', actions: [],       denied: ['VIEW'] },
      ],
    });
    expect(PermissionsService.check(payload, 'E04', 'security', 'VIEW')).toBe('DENY');
    // Other tabs unaffected by the security-tab deny
    expect(PermissionsService.check(payload, 'E04', null, 'VIEW')).toBe('ALLOW');
  });

  it('denies when the action appears in both actions and denied (explicit deny wins)', () => {
    // This represents a race between two roles: one allows, one denies.
    // The resolver compute step merges into `actions` (allow minus deny),
    // so `actions` will NOT include VIEW if denied. Simulate the merged state.
    const payload = makePayload({
      permissions: [
        { screen: 'E04', tab: 'roles', actions: [], denied: ['VIEW'] },
      ],
    });
    expect(PermissionsService.check(payload, 'E04', 'roles', 'VIEW')).toBe('DENY');
  });

  // 6. Whole-screen queries (tab omitted)

  it('evaluates screen-level rule when tab is null', () => {
    const payload = makePayload({
      permissions: [{ screen: 'S13', tab: null, actions: ['VIEW'], denied: [] }],
    });
    expect(PermissionsService.check(payload, 'S13', null, 'VIEW')).toBe('ALLOW');
  });

  it('returns DENY for a screen not in payload even if action matches another screen', () => {
    const payload = makePayload({
      permissions: [{ screen: 'E04', tab: null, actions: ['VIEW'], denied: [] }],
    });
    expect(PermissionsService.check(payload, 'E01', null, 'VIEW')).toBe('DENY');
  });
});
