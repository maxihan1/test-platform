import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { HUD이름뜰때까지, 레벨표시인가, 로그인화면준비 } from './helpers/login-tools.helper.js';
import { 지금화면, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 캐릭터값넣기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-060',
  name: '레벨이 31 인 캐릭터로 로그인하면 레벨이 30 으로 맞춰져 「Lv. 30」이 보인다',
  platforms: ['android'],
  precondition: ['새 계정 캐릭터 레벨이 31 로 들어가 있다'],
  elements: ['state:레벨=30', 'move:레벨 30→31'],
  params: z.object({
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 새 = 계정꺼내기(params.newId, params.newPassword, '새 계정');
  await test.cleanup('켜 둔 봇 끄기 · 새 계정 캐릭터 지우기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 새, 'new');
  });
  await test.step('새 계정 캐릭터 레벨을 31 로 넣는다', async () => {
    await 계정되돌리기(admin, 새, 'new');
    await 로그인화면준비(game, driver);
    await 로그인하기(game, driver, 새);
    await verify('새 계정 캐릭터가 생겨 상단 바에 이름이 보인다', await HUD이름뜰때까지(game, 새.아이디), true, { blocker: true });
    await 캐릭터값넣기(admin, 새, { level: 31 });
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('새 계정으로 로그인한다', async () => {
    await 로그인하기(game, driver, 새);
    await HUD이름뜰때까지(game, 새.아이디);
    const hud = new 공통HUD(game);
    await verify('레벨이 31 인 캐릭터로 로그인하면 레벨이 30 으로 맞춰져 「Lv. 30」이 보인다', 레벨표시인가(await hud.레벨글(), 30), true);
  });
});
