// customId 규약: '<action>:<arg>' 형태. 파싱 헬퍼와 함께 한 곳에서 관리.
export const ID = {
  APPLY: 'apply', // 패널의 '신청하기' 버튼
  CAL_VIEW: 'cal_view', // 'cal_view:2026-06' — 해당 월 달력 표시(이전/다음달·뒤로가기 공용)
  CAL_DATE: 'cal_date', // 날짜 드롭다운 (value = 'YYYY-MM-DD')
  BOOK: 'book', // 'book:<slotId>'
  CANCEL: 'cancel', // 'cancel:<bookingId>'
  MSG_OPEN: 'msg_open', // 'msg_open:<bookingId>' — 모달 열기
  MSG_SUBMIT: 'msg_submit', // 'msg_submit:<bookingId>' — 모달 제출
  SLOT_DELETE: 'slot_del', // 'slot_del:<slotId>' — 멘토용
};

export function make(action, arg) {
  return arg === undefined ? action : `${action}:${arg}`;
}

export function parse(customId) {
  const idx = customId.indexOf(':');
  if (idx === -1) return { action: customId, arg: null };
  return { action: customId.slice(0, idx), arg: customId.slice(idx + 1) };
}
