import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { isMentor } from '../config.js';
import { panelView } from '../ui/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('멘토링패널')
    .setDescription('[멘토] 이 채널에 멘토링 신청 패널을 게시해요'),

  async execute(interaction) {
    if (!isMentor(interaction.user.id)) {
      return interaction.reply({
        content: '이 명령은 멘토만 쓸 수 있어요.',
        flags: MessageFlags.Ephemeral,
      });
    }
    await interaction.channel.send(panelView());
    return interaction.reply({
      content: '✅ 패널을 게시했어요. 멤버들이 `신청하기`로 바로 예약할 수 있어요.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
