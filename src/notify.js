import { config } from './config.js';

// 특정 유저에게 DM 발송. 실패(차단/DM 비허용 등) 시 false 반환.
export async function sendUserDM(client, userId, payload) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(payload);
    return true;
  } catch (err) {
    console.warn(`DM 발송 실패 (user ${userId}):`, err.message);
    return false;
  }
}

// 멘토에게 DM. 실패하면 콘솔 경고만 남기고 흐름은 계속.
export async function sendMentorDM(client, payload) {
  return sendUserDM(client, config.mentorId, payload);
}
