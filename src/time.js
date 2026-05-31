import { DateTime } from 'luxon';
import { config } from './config.js';

const ZONE = config.timezone;
const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

// 현재 시각 (KST)
export function now() {
  return DateTime.now().setZone(ZONE);
}

// 'YYYY-MM-DD' + 'HH:mm' → DateTime (KST)
export function slotStart(slot) {
  return DateTime.fromISO(`${slot.date}T${slot.start_time}`, { zone: ZONE });
}

// luxon weekday: 1(월)~7(일) → 한글 요일
export function weekdayKo(dt) {
  // luxon: 7 = 일요일
  return WEEKDAYS_KO[dt.weekday % 7];
}

// '2026-06-03' → '6월 3일(화)'
export function formatDateKo(dateStr) {
  const dt = DateTime.fromISO(dateStr, { zone: ZONE });
  return `${dt.month}월 ${dt.day}일(${weekdayKo(dt)})`;
}

// 슬롯을 사람이 읽기 좋은 한 줄로: '6월 3일(화) 19:00~20:00'
export function formatSlotKo(slot) {
  return `${formatDateKo(slot.date)} ${slot.start_time}~${slot.end_time}`;
}

// 이미 시작 시각이 지났는지
export function isPast(slot) {
  return slotStart(slot) <= now();
}

export { ZONE, WEEKDAYS_KO };
