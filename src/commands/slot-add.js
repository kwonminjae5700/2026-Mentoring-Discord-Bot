import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { DateTime } from 'luxon';
import { isMentor } from '../config.js';
import { ZONE, formatSlotKo } from '../time.js';
import { addSlot, getSlot } from '../db.js';

export default {
  data: new SlashCommandBuilder()
    .setName('슬롯추가')
    .setDescription('[멘토] 멘토링 가능한 시간을 하나 추가해요')
    .addStringOption((o) =>
      o.setName('날짜').setDescription('예: 2026-06-03').setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('시작').setDescription('예: 19:00').setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('종료').setDescription('예: 20:00').setRequired(true)
    ),

  async execute(interaction) {
    if (!isMentor(interaction.user.id)) {
      return interaction.reply({
        content: '이 명령은 멘토만 쓸 수 있어요.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const date = interaction.options.getString('날짜').trim();
    const start = interaction.options.getString('시작').trim();
    const end = interaction.options.getString('종료').trim();

    const dateOk = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: ZONE }).isValid;
    const startDt = DateTime.fromFormat(start, 'HH:mm', { zone: ZONE });
    const endDt = DateTime.fromFormat(end, 'HH:mm', { zone: ZONE });

    if (!dateOk || !startDt.isValid || !endDt.isValid) {
      return interaction.reply({
        content: '형식을 다시 확인해 주세요. 날짜는 `2026-06-03`, 시간은 `19:00` 처럼요.',
        flags: MessageFlags.Ephemeral,
      });
    }
    if (endDt <= startDt) {
      return interaction.reply({
        content: '종료 시간이 시작 시간보다 늦어야 해요.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const id = addSlot(date, start, end);
    const slot = getSlot(id);
    return interaction.reply({
      content: `✅ 시간을 열었어요 — **${formatSlotKo(slot)}**`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
