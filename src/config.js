import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`⚠️  환경변수 ${name} 가 설정되지 않았어요. .env 파일을 확인해 주세요.`);
  }
  return value;
}

export const config = {
  token: required('DISCORD_TOKEN'),
  clientId: required('CLIENT_ID'),
  guildId: required('GUILD_ID'),
  mentorId: required('MENTOR_USER_ID'),
  panelChannelId: process.env.PANEL_CHANNEL_ID || null,
  timezone: process.env.TIMEZONE || 'Asia/Seoul',
};

// 토스 블루 — 임베드 전반에서 일관되게 사용
export const COLORS = {
  brand: 0x3182f6, // 메인
  success: 0x2ac1bc, // 예약 완료 등 긍정
  muted: 0x8b95a1, // 비활성/회색
  warn: 0xff8a00, // 재촉 등 주의
};

export function isMentor(userId) {
  return userId === config.mentorId;
}
