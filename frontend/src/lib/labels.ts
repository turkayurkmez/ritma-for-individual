import type { AppointmentStatus, Gender } from '../api/types';

export const GENDERS: Gender[] = ['female', 'male', 'other', 'undisclosed'];
export const STATUSES: AppointmentStatus[] = ['scheduled', 'completed', 'cancelled'];

const genderLabels: Record<Gender, string> = {
  female: 'Kadın',
  male: 'Erkek',
  other: 'Diğer',
  undisclosed: 'Belirtmek istemiyorum',
};

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

export function genderLabel(gender: Gender): string {
  return genderLabels[gender];
}

export function statusLabel(status: AppointmentStatus): string {
  return statusLabels[status];
}
