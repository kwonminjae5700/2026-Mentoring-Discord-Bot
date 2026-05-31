import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { DateTime } from 'luxon';
import { ID, make } from '../ids.js';
import { COLORS } from '../config.js';
import { ZONE, formatSlotKo, formatDateKo } from '../time.js';

// ── 공개 패널 ──────────────────────────────────────────────
export function panelView() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle('☕  멘토링 신청하기')
    .setDescription(
      '편하게 이야기 나누고 싶은 시간을 골라보세요.\n' +
        '날짜를 고르면 그 날 비어있는 시간이 보여요.\n\n' +
        '예약 후엔 만나기 하루 전까지 **나누고 싶은 말**을 적어주시면,\n' +
        '더 알찬 시간을 준비할 수 있어요. 🙂'
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(ID.APPLY).setLabel('신청하기').setStyle(ButtonStyle.Primary).setEmoji('🗓️')
  );
  return { embeds: [embed], components: [row] };
}

// ── 예약 1건 관리 카드 (예약 직후 / 내멘토링 공용) ─────────────
function bookingCard(booking) {
  const hasMsg = !!booking.message;
  const embed = new EmbedBuilder()
    .setColor(hasMsg ? COLORS.success : COLORS.brand)
    .setTitle('🎉  예약했어요')
    .setDescription(`**${formatSlotKo(booking.slot)}**`)
    .addFields({
      name: '나누고 싶은 말',
      value: hasMsg
        ? '작성 완료 — 언제든 수정할 수 있어요.'
        : '아직 비어 있어요. 만나기 하루 전까지 적어주세요.',
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(make(ID.MSG_OPEN, booking.id))
      .setLabel(hasMsg ? '나누고 싶은 말 수정' : '나누고 싶은 말 작성')
      .setStyle(hasMsg ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setEmoji('✍️'),
    new ButtonBuilder()
      .setCustomId(make(ID.CANCEL, booking.id))
      .setLabel('예약 취소')
      .setStyle(ButtonStyle.Danger)
  );
  return { embed, row };
}

export function bookingConfirmView(booking) {
  const { embed, row } = bookingCard(booking);
  return { embeds: [embed], components: [row] };
}

// ── /내멘토링 — 내 예약 목록 ───────────────────────────────
export function myBookingsView(bookings) {
  if (!bookings.length) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.muted)
      .setTitle('내 멘토링')
      .setDescription('아직 예약한 시간이 없어요.\n멘토링 패널에서 `신청하기`를 눌러 시작해보세요. 🙂');
    return { embeds: [embed], components: [] };
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle('📒  내 멘토링')
    .setDescription('예약한 시간이에요. 버튼으로 나누고 싶은 말을 적거나 예약을 취소할 수 있어요.')
    .addFields(
      bookings.slice(0, 5).map((b) => ({
        name: formatSlotKo(b.slot),
        value: b.message ? '✅ 나누고 싶은 말 작성 완료' : '⏳ 나누고 싶은 말 미작성',
      }))
    );

  const rows = bookings.slice(0, 5).map((b) => {
    const d = DateTime.fromISO(b.slot.date, { zone: ZONE });
    const tag = `${d.month}/${d.day} ${b.slot.start_time}`;
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(make(ID.MSG_OPEN, b.id))
        .setLabel(`${tag} · 말 ${b.message ? '수정' : '작성'}`)
        .setStyle(b.message ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setEmoji('✍️'),
      new ButtonBuilder()
        .setCustomId(make(ID.CANCEL, b.id))
        .setLabel('취소')
        .setStyle(ButtonStyle.Danger)
    );
  });

  return { embeds: [embed], components: rows };
}

// ── 나누고 싶은 말 모달 ────────────────────────────────────
export function messageModal(booking) {
  const modal = new ModalBuilder()
    .setCustomId(make(ID.MSG_SUBMIT, booking.id))
    .setTitle('나누고 싶은 말');

  const input = new TextInputBuilder()
    .setCustomId('content')
    .setLabel('편하게 적어주세요 (마크다운 가능)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('요즘 고민, 듣고 싶은 이야기, 함께 보고 싶은 것 등 무엇이든 좋아요.')
    .setRequired(true)
    .setMaxLength(2000);

  if (booking.message) input.setValue(booking.message);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

// ── 멘토에게 가는 DM ───────────────────────────────────────
export function mentorNewBookingDM(booking, menteeMention) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('🔔  새 멘토링 신청')
    .setDescription(`${menteeMention} 님이 시간을 예약했어요.`)
    .addFields(
      { name: '일정', value: formatSlotKo(booking.slot) },
      { name: '멘티', value: `${booking.mentee_name}` }
    );
  return { embeds: [embed] };
}

export function mentorMessageDM(booking, menteeMention) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle('💬  나누고 싶은 말이 도착했어요')
    .setDescription(`${menteeMention} 님의 메시지예요.`)
    .addFields(
      { name: '일정', value: formatSlotKo(booking.slot) },
      { name: '멘티', value: `${booking.mentee_name}` },
      { name: '내용', value: trim(booking.message, 1024) }
    );
  return { embeds: [embed] };
}

// ── 멘티에게 가는 재촉 DM ──────────────────────────────────
export function reminderDM(booking) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.warn)
    .setTitle('✍️  내일 만나요! 나누고 싶은 말 적어주실래요?')
    .setDescription(
      `**${formatSlotKo(booking.slot)}** 멘토링이 곧 다가와요.\n` +
        '아직 나누고 싶은 말이 비어 있어서 살짝 알려드려요.\n\n' +
        '`/내멘토링` 을 입력하면 바로 적을 수 있어요. 🙂'
    );
  return { embeds: [embed] };
}

function trim(text, max) {
  if (!text) return '(내용 없음)';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export { formatDateKo };
