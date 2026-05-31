import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { DateTime } from 'luxon';
import { ID, make } from '../ids.js';
import { COLORS } from '../config.js';
import { ZONE, formatDateKo, isPast } from '../time.js';
import { getSlotsForDate } from '../db.js';

// 특정 날짜의 시간 슬롯들을 버튼으로 그린다.
// - 예약 가능: 파란 버튼(book)
// - 내가 예약함: 초록 버튼(취소 가능)
// - 다른 사람 예약/지난 시간: 회색 + 비활성
export function buildDateView(date, userId) {
  const slots = getSlotsForDate(date);

  const embed = new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle(`⏰  ${formatDateKo(date)}`)
    .setDescription(
      slots.length
        ? '원하는 시간을 눌러 바로 예약할 수 있어요.\n회색 시간은 이미 다른 분이 잡으셨어요.'
        : '이 날엔 열린 시간이 없어요.'
    );

  const rows = [];
  let row = new ActionRowBuilder();
  for (const slot of slots) {
    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }
    const label = `${slot.start_time}~${slot.end_time}`;
    const mine = slot.booking && slot.booking.mentee_id === userId;
    const taken = slot.booking && !mine;
    const past = isPast(slot);

    let btn;
    if (mine) {
      btn = new ButtonBuilder()
        .setCustomId(make(ID.CANCEL, slot.booking.id))
        .setLabel(`${label} · 내 예약 ✓`)
        .setStyle(ButtonStyle.Success);
    } else if (taken || past) {
      btn = new ButtonBuilder()
        .setCustomId(make(ID.BOOK, slot.id))
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);
    } else {
      btn = new ButtonBuilder()
        .setCustomId(make(ID.BOOK, slot.id))
        .setLabel(label)
        .setStyle(ButtonStyle.Primary);
    }
    row.components.push(btn);
  }
  if (row.components.length) rows.push(row);

  // 달력으로 돌아가기
  const dt = DateTime.fromISO(date, { zone: ZONE });
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(make(ID.CAL_VIEW, `${dt.year}-${String(dt.month).padStart(2, '0')}`))
      .setLabel('◀ 달력으로')
      .setStyle(ButtonStyle.Secondary)
  );
  rows.push(backRow);

  return { embeds: [embed], components: rows.slice(0, 5) };
}
