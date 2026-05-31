import {
  SlashCommandBuilder,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { isMentor, COLORS } from '../config.js';
import { formatSlotKo, isPast } from '../time.js';
import { getAllSlots } from '../db.js';
import { ID } from '../ids.js';

// 멘토용 슬롯 현황 + 삭제 드롭다운
export function buildSlotListView() {
  const slots = getAllSlots();

  const embed = new EmbedBuilder().setColor(COLORS.brand).setTitle('🛠️  열어둔 시간 관리');

  if (!slots.length) {
    embed.setDescription('아직 열어둔 시간이 없어요. `/슬롯추가` 로 시간을 만들어보세요.');
    return { embeds: [embed], components: [] };
  }

  embed.setDescription(
    slots
      .map((s) => {
        let status;
        if (s.booking) status = `🔒 ${s.booking.mentee_name} 예약${s.booking.message ? ' · 말 작성됨' : ''}`;
        else if (isPast(s)) status = '⌛ 지난 시간';
        else status = '🟢 예약 가능';
        return `• **${formatSlotKo(s)}** — ${status}`;
      })
      .join('\n')
      .slice(0, 4000)
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId(ID.SLOT_DELETE)
    .setPlaceholder('삭제할 시간을 고르세요')
    .addOptions(
      slots.slice(0, 25).map((s) => ({
        label: formatSlotKo(s),
        description: s.booking ? `예약됨 · ${s.booking.mentee_name}` : '예약 없음',
        value: String(s.id),
      }))
    );

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] };
}

export default {
  data: new SlashCommandBuilder()
    .setName('슬롯목록')
    .setDescription('[멘토] 열어둔 시간과 예약 현황을 봐요'),

  async execute(interaction) {
    if (!isMentor(interaction.user.id)) {
      return interaction.reply({
        content: '이 명령은 멘토만 쓸 수 있어요.',
        flags: MessageFlags.Ephemeral,
      });
    }
    return interaction.reply({ ...buildSlotListView(), flags: MessageFlags.Ephemeral });
  },
};
