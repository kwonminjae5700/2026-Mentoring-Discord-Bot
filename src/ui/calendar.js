import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} from 'discord.js';
import { DateTime } from 'luxon';
import { ID, make } from '../ids.js';
import { COLORS } from '../config.js';
import { ZONE, now, isPast, formatDateKo } from '../time.js';
import { getAllSlots } from '../db.js';
import { renderCalendarPng } from './calendar-image.js';

// 해당 월의 날짜별 '예약 가능한 빈자리 수' 맵을 만든다.
function availableCountByDate() {
  const map = new Map();
  for (const slot of getAllSlots()) {
    if (slot.booking || isPast(slot)) continue; // 이미 예약됐거나 지난 시간은 제외
    map.set(slot.date, (map.get(slot.date) || 0) + 1);
  }
  return map;
}

// year, month(1~12) 달력 화면 한 세트(임베드 + 컴포넌트 + 이미지) 생성
export function buildCalendarView(year, month) {
  const availMap = availableCountByDate();

  // 토스풍 캘린더 PNG 렌더 후 임베드 이미지로 첨부
  const png = renderCalendarPng(year, month, availMap, now().toFormat('yyyy-MM-dd'));
  const attachment = new AttachmentBuilder(png, { name: 'calendar.png' });

  // 이 달의 예약 가능한 날짜만 추려 드롭다운 옵션으로
  const openDates = [...availMap.entries()]
    .filter(([date]) => {
      const dt = DateTime.fromISO(date, { zone: ZONE });
      return dt.year === year && dt.month === month;
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

  const embed = new EmbedBuilder()
    .setColor(COLORS.brand)
    .setImage('attachment://calendar.png')
    .setDescription(
      openDates.length
        ? '파란 날에 자리가 있어요. 아래에서 날짜를 골라주세요. 🙂'
        : '이 달엔 아직 열린 시간이 없어요. 다른 달도 살펴볼까요?'
    );

  // 이전/다음 달 네비게이션
  const cur = DateTime.fromObject({ year, month, day: 1 }, { zone: ZONE });
  const prev = cur.minus({ months: 1 });
  const next = cur.plus({ months: 1 });
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(make(ID.CAL_VIEW, `${prev.year}-${String(prev.month).padStart(2, '0')}`))
      .setLabel(`◀ ${prev.month}월`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(make(ID.CAL_VIEW, `${next.year}-${String(next.month).padStart(2, '0')}`))
      .setLabel(`${next.month}월 ▶`)
      .setStyle(ButtonStyle.Secondary)
  );

  // 날짜 드롭다운
  const select = new StringSelectMenuBuilder()
    .setCustomId(ID.CAL_DATE)
    .setPlaceholder(openDates.length ? '날짜를 골라주세요' : '이 달엔 열린 시간이 없어요');

  if (openDates.length) {
    select.addOptions(
      openDates.slice(0, 25).map(([date, count]) => ({
        label: formatDateKo(date),
        description: `자리 ${count}개 남았어요`,
        value: date,
      }))
    );
  } else {
    select.addOptions({ label: '없음', value: 'none' }).setDisabled(true);
  }
  const selectRow = new ActionRowBuilder().addComponents(select);

  return { embeds: [embed], components: [navRow, selectRow], files: [attachment] };
}

// 진입 시 기본으로 보여줄 달 (오늘 기준)
export function currentYearMonth() {
  const t = now();
  return { year: t.year, month: t.month };
}
