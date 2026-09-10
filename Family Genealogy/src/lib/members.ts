import { fullName } from './utils';

export type MemberOption = { id: string; name: string };

export function memberOptions(members: Array<{ id: string; firstName: string; lastName: string }>): MemberOption[] {
  return members.map((m) => ({ id: m.id, name: fullName(m) }));
}