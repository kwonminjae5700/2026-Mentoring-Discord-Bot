import { Client, GatewayIntentBits, Collection, Events, MessageFlags } from 'discord.js';
import { config } from './config.js';
import { handleComponent, handleModal } from './interactions/router.js';
import { startScheduler } from './scheduler.js';

import slotAdd from './commands/slot-add.js';
import slotList from './commands/slot-list.js';
import panel from './commands/panel.js';
import my from './commands/my.js';

const commands = new Collection();
for (const cmd of [slotAdd, slotList, panel, my]) {
  commands.set(cmd.data.name, cmd);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`✅ 로그인 완료: ${c.user.tag}`);
  startScheduler(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = commands.get(interaction.commandName);
      if (cmd) await cmd.execute(interaction);
    } else if (interaction.isButton() || interaction.isStringSelectMenu()) {
      await handleComponent(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
  } catch (err) {
    console.error('인터랙션 처리 오류:', err);
    const msg = { content: '앗, 잠시 문제가 생겼어요. 다시 시도해 주세요.', flags: MessageFlags.Ephemeral };
    try {
      if (interaction.deferred || interaction.replied) await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch {
      /* 응답 불가 상태면 무시 */
    }
  }
});

client.login(config.token);
