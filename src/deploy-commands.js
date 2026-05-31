import { REST, Routes } from 'discord.js';
import { config } from './config.js';

import slotAdd from './commands/slot-add.js';
import slotList from './commands/slot-list.js';
import panel from './commands/panel.js';
import my from './commands/my.js';

const body = [slotAdd, slotList, panel, my].map((c) => c.data.toJSON());

const rest = new REST().setToken(config.token);

try {
  console.log(`슬래시 명령 ${body.length}개를 등록하는 중...`);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
  console.log('✅ 명령 등록 완료! (해당 서버에 즉시 반영돼요)');
} catch (err) {
  console.error('명령 등록 실패:', err);
  process.exit(1);
}
