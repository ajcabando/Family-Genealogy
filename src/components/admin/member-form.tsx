'use client';

export type MemberFormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  maidenName: string;
  nickname: string;
  gender: string;
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
  biography: string;
  occupation: string;
  location: string;
  branch: string;
};

export function emptyMemberForm(): MemberFormState {
  return {
    firstName: '',
    middleName: '',
    lastName: '',
    maidenName: '',
    nickname: '',
    gender: 'UNKNOWN',
    birthDate: '',
    birthPlace: '',
    deathDate: '',
    deathPlace: '',
    biography: '',
    occupation: '',
    location: '',
    branch: '',
  };
}

export function memberFormFrom(m: Record<string, unknown>): MemberFormState {
  const d = (v: unknown) => (v ? String(v).slice(0, 10) : '');
  return {
    firstName: String(m.firstName || ''),
    middleName: String(m.middleName || ''),
    lastName: String(m.lastName || ''),
    maidenName: String(m.maidenName || ''),
    nickname: String(m.nickname || ''),
    gender: String(m.gender || 'UNKNOWN'),
    birthDate: d(m.birthDate),
    birthPlace: String(m.birthPlace || ''),
    deathDate: d(m.deathDate),
    deathPlace: String(m.deathPlace || ''),
    biography: String(m.biography || ''),
    occupation: String(m.occupation || ''),
    location: String(m.location || ''),
    branch: String(m.branch || ''),
  };
}

export function MemberFormFields({ form, setForm }: { form: MemberFormState; setForm: (f: MemberFormState) => void }) {
  const input = 'input';
  const label = 'label';
  const set = (k: keyof MemberFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div><label className={label}>First name *</label><input className={input} value={form.firstName} onChange={set('firstName')} required /></div>
      <div><label className={label}>Last name *</label><input className={input} value={form.lastName} onChange={set('lastName')} required /></div>
      <div><label className={label}>Middle name</label><input className={input} value={form.middleName} onChange={set('middleName')} /></div>
      <div><label className={label}>Maiden name</label><input className={input} value={form.maidenName} onChange={set('maidenName')} /></div>
      <div><label className={label}>Nickname</label><input className={input} value={form.nickname} onChange={set('nickname')} /></div>
      <div>
        <label className={label}>Gender</label>
        <select className={input} value={form.gender} onChange={set('gender')}>
          <option value="UNKNOWN">Unknown</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div><label className={label}>Birth date</label><input type="date" className={input} value={form.birthDate} onChange={set('birthDate')} /></div>
      <div><label className={label}>Birth place</label><input className={input} value={form.birthPlace} onChange={set('birthPlace')} /></div>
      <div><label className={label}>Death date</label><input type="date" className={input} value={form.deathDate} onChange={set('deathDate')} /></div>
      <div><label className={label}>Death place</label><input className={input} value={form.deathPlace} onChange={set('deathPlace')} /></div>
      <div><label className={label}>Occupation</label><input className={input} value={form.occupation} onChange={set('occupation')} /></div>
      <div><label className={label}>Location</label><input className={input} value={form.location} onChange={set('location')} placeholder="General area only" /></div>
      <div className="sm:col-span-2"><label className={label}>Family branch</label><input className={input} value={form.branch} onChange={set('branch')} placeholder="e.g. Cruz – Cebu" /></div>
      <div className="sm:col-span-2"><label className={label}>Biography</label><textarea className={input} rows={4} value={form.biography} onChange={set('biography')} /></div>
    </div>
  );
}