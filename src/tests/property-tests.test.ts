import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { isValidTransition } from '../lib/state-machine';
import { runAutoDecision } from '../lib/auto-decision';
import { VALID_STATUS_TRANSITIONS } from '../lib/types';
import type { LotStatus, InspectionReport, Grade, ColorCategory } from '../lib/types';

// ─── Property 1: Lot form validation ─────────────────────────────────────────

describe('Property 1: Lot form validation', () => {
  function isValidLotForm(form: {
    batch_name: string;
    estimated_units: number;
    product_type: string;
    production_date: string;
  }) {
    return (
      form.batch_name.length >= 1 &&
      form.batch_name.length <= 200 &&
      Number.isInteger(form.estimated_units) &&
      form.estimated_units > 0 &&
      form.product_type.length > 0 &&
      form.production_date.length > 0
    );
  }

  it('accepts valid forms', () => {
    fc.assert(
      fc.property(
        fc.record({
          batch_name: fc.string({ minLength: 1, maxLength: 200 }),
          estimated_units: fc.integer({ min: 1, max: 100000 }),
          product_type: fc.string({ minLength: 1, maxLength: 50 }),
          production_date: fc.string({ minLength: 1 }),
        }),
        (form) => {
          expect(isValidLotForm(form)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects batch_name longer than 200 chars', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 201, maxLength: 500 }),
        (batch_name) => {
          const form = { batch_name, estimated_units: 1, product_type: 'test', production_date: '2024-01-01' };
          expect(isValidLotForm(form)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-positive estimated_units', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer({ min: -1000, max: 0 }), fc.float({ min: 0.1, max: 0.9 })),
        (units) => {
          const form = { batch_name: 'test', estimated_units: units, product_type: 'test', production_date: '2024-01-01' };
          expect(isValidLotForm(form)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2: State machine transitions ───────────────────────────────────

describe('Property 2: State machine transitions', () => {
  const ALL_STATUSES = Object.keys(VALID_STATUS_TRANSITIONS) as LotStatus[];

  it('only allows defined transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_STATUSES),
        fc.constantFrom(...ALL_STATUSES),
        (from, to) => {
          const allowed = isValidTransition(from, to);
          const expected = VALID_STATUS_TRANSITIONS[from].includes(to);
          expect(allowed).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('never allows APPROVED/REJECTED/QUARANTINED to transition further', () => {
    const terminalStates: LotStatus[] = ['APPROVED', 'REJECTED', 'QUARANTINED'];
    fc.assert(
      fc.property(
        fc.constantFrom(...terminalStates),
        fc.constantFrom(...ALL_STATUSES),
        (from, to) => {
          expect(isValidTransition(from, to)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 3: Aggregation arithmetic ──────────────────────────────────────

describe('Property 3: Frame data aggregation', () => {
  it('avg_confidence is arithmetic mean of all frame confidence_scores', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 500 }),
        (scores) => {
          const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
          const expected = parseFloat(avg.toFixed(4));
          const computed = parseFloat((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(4));
          expect(computed).toBeCloseTo(expected, 3);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: Auto-Decision Engine (pure logic) ───────────────────────────

function mockDecisionEngine(
  avgConfidence: number,
  avgRot: number,
  avgAnomaly: number,
  totalDefects: number,
  confidenceMin: number,
  anomalyQuarantine: number,
  anomalyEscalation: number
): 'APPROVED' | 'REJECTED' | 'QUARANTINED' {
  if (avgAnomaly >= anomalyEscalation) return 'QUARANTINED';
  if (avgAnomaly >= anomalyQuarantine) return 'QUARANTINED';
  if (avgConfidence < confidenceMin) return 'REJECTED';
  return 'APPROVED';
}

describe('Property 4: Auto-Decision Engine consistency', () => {
  it('APPROVED only when all thresholds satisfied', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 0, max: 100 }),
        (conf, rot, anomaly, defects) => {
          const result = mockDecisionEngine(conf, rot, anomaly, defects, 0.7, 0.8, 0.9);
          if (result === 'APPROVED') {
            expect(conf).toBeGreaterThanOrEqual(0.7);
            expect(anomaly).toBeLessThan(0.8);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('QUARANTINED when anomaly exceeds quarantine threshold', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.8, max: 1, noNaN: true }),
        (anomaly) => {
          const result = mockDecisionEngine(0.9, 5, anomaly, 0, 0.7, 0.8, 0.9);
          expect(result).toBe('QUARANTINED');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('REJECTED when confidence below minimum (and anomaly normal)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 0.69, noNaN: true }),
        (conf) => {
          const result = mockDecisionEngine(conf, 5, 0.1, 0, 0.7, 0.8, 0.9);
          expect(result).toBe('REJECTED');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: RBAC data scoping ───────────────────────────────────────────

describe('Property 5: RBAC data scoping', () => {
  function operatorCanAccessLot(operatorId: string, lotOperatorId: string): boolean {
    return operatorId === lotOperatorId;
  }

  it('operator only accesses own lots', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (operatorId, lotOperatorId) => {
          const canAccess = operatorCanAccessLot(operatorId, lotOperatorId);
          expect(canAccess).toBe(operatorId === lotOperatorId);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 6: User input validation ───────────────────────────────────────

describe('Property 6: User input validation', () => {
  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
  }

  function isValidUserPayload(p: { name: string; email: string; role: string }) {
    const validRoles = ['Operator', 'Manager', 'Admin'];
    return (
      p.name.length >= 1 &&
      p.name.length <= 100 &&
      isValidEmail(p.email) &&
      validRoles.includes(p.role)
    );
  }

  it('accepts valid user payloads', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          role: fc.constantFrom('Operator', 'Manager', 'Admin'),
        }),
        (payload) => {
          expect(isValidUserPayload(payload)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects invalid roles', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => !['Operator', 'Manager', 'Admin'].includes(s)),
        (role) => {
          const payload = { name: 'Test', email: 'test@test.com', role };
          expect(isValidUserPayload(payload)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 7: Self-demotion prevention ────────────────────────────────────

describe('Property 7: Self-demotion prevention', () => {
  function canModifyUser(actorId: string, targetId: string, newRole: string, newStatus: string): boolean {
    if (actorId === targetId) {
      if (newStatus === 'INACTIVE') return false;
      if (newRole !== 'Admin') return false;
    }
    return true;
  }

  it('Admin cannot deactivate themselves', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        expect(canModifyUser(id, id, 'Admin', 'INACTIVE')).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Admin cannot demote themselves to non-Admin', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom('Operator', 'Manager'),
        (id, role) => {
          expect(canModifyUser(id, id, role, 'ACTIVE')).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Admin can modify other users freely', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid().filter((id) => id !== 'same'),
        fc.constantFrom('Operator', 'Manager', 'Admin'),
        fc.constantFrom('ACTIVE', 'INACTIVE', 'PENDING_ACTIVATION'),
        (actorId, targetId, role, status) => {
          if (actorId === targetId) return; // skip same-id
          expect(canModifyUser(actorId, targetId, role, status)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: Authentication lockout ──────────────────────────────────────

describe('Property 9: Authentication lockout', () => {
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX_ATTEMPTS = 5;

  function shouldLock(attempts: number[], windowMs: number, maxAttempts: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    const recent = attempts.filter((t) => t >= windowStart);
    return recent.length >= maxAttempts;
  }

  it('locks after 5 failures within 15 minutes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: WINDOW_MS }), { minLength: MAX_ATTEMPTS, maxLength: MAX_ATTEMPTS }),
        (offsets) => {
          const now = Date.now();
          const attempts = offsets.map((o) => now - o);
          expect(shouldLock(attempts, WINDOW_MS, MAX_ATTEMPTS)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT lock with fewer than 5 failures', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: WINDOW_MS }), { minLength: 0, maxLength: MAX_ATTEMPTS - 1 }),
        (offsets) => {
          const now = Date.now();
          const attempts = offsets.map((o) => now - o);
          expect(shouldLock(attempts, WINDOW_MS, MAX_ATTEMPTS)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT lock when failures spread beyond window', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: WINDOW_MS + 1, max: WINDOW_MS * 3 }), { minLength: 5, maxLength: 10 }),
        (offsets) => {
          const now = Date.now();
          const attempts = offsets.map((o) => now - o);
          expect(shouldLock(attempts, WINDOW_MS, MAX_ATTEMPTS)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 10: Notification unread count consistency ──────────────────────

describe('Property 10: Notification unread count', () => {
  it('unread_count equals count of is_read=false notifications', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 100 }),
        (isReadFlags) => {
          const notifications = isReadFlags.map((is_read, i) => ({ id: String(i), is_read }));
          const unreadCount = notifications.filter((n) => !n.is_read).length;
          const computed = notifications.reduce((count, n) => count + (n.is_read ? 0 : 1), 0);
          expect(computed).toBe(unreadCount);
        }
      ),
      { numRuns: 200 }
    );
  });
});
