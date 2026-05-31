import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getBookingsByMentee } from '../db.js';
import { myBookingsView } from '../ui/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('내멘토링')
    .setDescription('내가 예약한 멘토링을 보고, 나누고 싶은 말을 적어요'),

  async execute(interaction) {
    const bookings = getBookingsByMentee(interaction.user.id);
    return interaction.reply({
      ...myBookingsView(bookings),
      flags: MessageFlags.Ephemeral,
    });
  },
};
