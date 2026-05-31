import { MessageFlags } from 'discord.js';
import { ID, parse } from '../ids.js';
import { isMentor } from '../config.js';
import { isPast } from '../time.js';
import {
  getSlot,
  createBooking,
  getBooking,
  cancelBooking,
  setBookingMessage,
  deleteSlot,
} from '../db.js';
import { buildCalendarView, currentYearMonth } from '../ui/calendar.js';
import { buildDateView } from '../ui/slots.js';
import {
  bookingConfirmView,
  messageModal,
  mentorNewBookingDM,
  mentorMessageDM,
} from '../ui/embeds.js';
import { buildSlotListView } from '../commands/slot-list.js';
import { sendMentorDM } from '../notify.js';

function parseMonth(arg) {
  const [y, m] = arg.split('-').map(Number);
  return { year: y, month: m };
}

function displayName(interaction) {
  return interaction.member?.displayName || interaction.user.globalName || interaction.user.username;
}

// 화면 갱신 시 이전 첨부(예: 달력 PNG)를 항상 비워, 뷰 전환마다 깨끗하게 교체.
function update(interaction, view) {
  return interaction.update({ ...view, attachments: [] });
}

// 버튼 / 셀렉트 메뉴 처리
export async function handleComponent(interaction) {
  const { action, arg } = parse(interaction.customId);

  switch (action) {
    case ID.APPLY: {
      const { year, month } = currentYearMonth();
      return interaction.reply({
        ...buildCalendarView(year, month),
        flags: MessageFlags.Ephemeral,
      });
    }

    case ID.CAL_VIEW: {
      const { year, month } = parseMonth(arg);
      return update(interaction, buildCalendarView(year, month));
    }

    case ID.CAL_DATE: {
      const date = interaction.values[0];
      return update(interaction, buildDateView(date, interaction.user.id));
    }

    case ID.BOOK: {
      const slot = getSlot(Number(arg));
      if (!slot) {
        return interaction.reply({
          content: '앗, 그 시간이 사라졌어요. 다시 골라주세요.',
          flags: MessageFlags.Ephemeral,
        });
      }
      if (slot.booking || isPast(slot)) {
        // 화면 갱신 + 안내
        await update(interaction, buildDateView(slot.date, interaction.user.id));
        return interaction.followUp({
          content: '방금 다른 분이 먼저 예약했어요. 다른 시간을 골라볼까요?',
          flags: MessageFlags.Ephemeral,
        });
      }

      const bookingId = createBooking(slot.id, interaction.user.id, displayName(interaction));
      if (!bookingId) {
        await update(interaction, buildDateView(slot.date, interaction.user.id));
        return interaction.followUp({
          content: '방금 다른 분이 먼저 예약했어요. 다른 시간을 골라볼까요?',
          flags: MessageFlags.Ephemeral,
        });
      }

      const booking = getBooking(bookingId);
      await update(interaction, bookingConfirmView(booking));
      // 멘토에게 알림 DM
      await sendMentorDM(
        interaction.client,
        mentorNewBookingDM(booking, `<@${interaction.user.id}>`)
      );
      return;
    }

    case ID.CANCEL: {
      const booking = getBooking(Number(arg));
      if (!booking || booking.mentee_id !== interaction.user.id) {
        return interaction.reply({
          content: '취소할 예약을 찾지 못했어요.',
          flags: MessageFlags.Ephemeral,
        });
      }
      const date = booking.slot.date;
      cancelBooking(booking.id, interaction.user.id);
      return update(interaction, buildDateView(date, interaction.user.id));
    }

    case ID.MSG_OPEN: {
      const booking = getBooking(Number(arg));
      if (!booking || booking.mentee_id !== interaction.user.id) {
        return interaction.reply({
          content: '예약을 찾지 못했어요.',
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.showModal(messageModal(booking));
    }

    case ID.SLOT_DELETE: {
      if (!isMentor(interaction.user.id)) {
        return interaction.reply({
          content: '멘토만 쓸 수 있어요.',
          flags: MessageFlags.Ephemeral,
        });
      }
      deleteSlot(Number(interaction.values[0]));
      return update(interaction, buildSlotListView());
    }

    default:
      return;
  }
}

// 모달 제출 처리 (나누고 싶은 말)
export async function handleModal(interaction) {
  const { action, arg } = parse(interaction.customId);
  if (action !== ID.MSG_SUBMIT) return;

  const booking = getBooking(Number(arg));
  if (!booking || booking.mentee_id !== interaction.user.id) {
    return interaction.reply({
      content: '예약을 찾지 못했어요.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const content = interaction.fields.getTextInputValue('content').trim();
  setBookingMessage(booking.id, content);
  const updated = getBooking(booking.id);

  await interaction.reply({
    content: '✅ 나누고 싶은 말을 저장했어요. 만나기 전까지 언제든 수정할 수 있어요.',
    flags: MessageFlags.Ephemeral,
  });

  // 멘토에게 내용 DM
  await sendMentorDM(
    interaction.client,
    mentorMessageDM(updated, `<@${interaction.user.id}>`)
  );
}
