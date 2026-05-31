import cron from 'node-cron';
import { now, slotStart } from './time.js';
import { getBookingsAwaitingMessage, markReminderSent } from './db.js';
import { reminderDM } from './ui/embeds.js';
import { formatSlotKo } from './time.js';
import { sendUserDM, sendMentorDM } from './notify.js';

// 세션 시작이 24시간 이내인데 '나누고 싶은 말'이 비어 있으면 멘티에게 재촉 DM
export async function runReminderSweep(client) {
  const t = now();
  for (const booking of getBookingsAwaitingMessage()) {
    const start = slotStart(booking.slot);
    const hoursLeft = start.diff(t, 'hours').hours;
    // 이미 지난 세션은 건너뜀, 24시간 이내일 때만 재촉
    if (hoursLeft <= 0 || hoursLeft > 24) continue;

    const ok = await sendUserDM(client, booking.mentee_id, reminderDM(booking));
    markReminderSent(booking.id); // 성공/실패와 무관하게 중복 재촉 방지

    if (!ok) {
      // 멘티에게 DM이 닿지 않으면 멘토에게 폴백 보고
      await sendMentorDM(client, {
        content: `⚠️ **${booking.mentee_name}** 님께 재촉 DM을 보내지 못했어요 (DM 차단/비허용).\n해당 멘토링: ${formatSlotKo(booking.slot)} — 직접 알려주셔야 할 수 있어요.`,
      });
    }
  }
}

export function startScheduler(client) {
  // 매시 정각 실행 (KST 기준 동작은 hoursLeft 계산에 반영됨)
  cron.schedule('0 * * * *', () => {
    runReminderSweep(client).catch((e) => console.error('리마인더 스윕 오류:', e));
  });
  console.log('⏰ 리마인더 스케줄러 시작 (매시 정각)');
}
