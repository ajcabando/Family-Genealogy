/**
 * PROFILE_UPDATE change requests store the change as `{ field, value }`.
 * Some older/seeded rows were created as `{ [field]: value }` instead (e.g.
 * `{ nickname: 'Sofie' }`), which the approval API rejects with "Invalid field".
 *
 * `normalizeProfileUpdate` reads both shapes so pending requests created
 * before the fix can still be approved.
 */
export function normalizeProfileUpdate(proposed: Record<string, unknown> | null | undefined): { field: string; value: unknown } {
  if (proposed && typeof proposed.field === 'string' && proposed.field) {
    return { field: proposed.field, value: proposed.value };
  }
  // Legacy shape: first non-meta key holds the field name.
  if (proposed) {
    for (const key of Object.keys(proposed)) {
      if (key === 'field' || key === 'value') continue;
      return { field: key, value: proposed[key] };
    }
  }
  return { field: '', value: undefined };
}
