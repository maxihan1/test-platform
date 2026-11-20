import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { HUD이름뜰때까지, 캐릭터없음 } from './helpers/login-tools.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-057',
  name: '캐릭터가 없는 계정으로 처음 로그인하면 골드가 「200 G」다',
  platforms: ['android'],
  precondition: ['새 계정의 캐릭터가 지워져 있다'],
  elements: ['flow:골드-시작 지급'],
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
  await test.step('새 계정의 캐릭터를 지운다', async () => {
    await 계정되돌리기(admin, 새, 'new');
    await verify('새 계정의 캐릭터가 지워져 있다', await 캐릭터없음(admin, 새.아이디), true, { blocker: true });
  });
  await test.step('새 계정으로 처음 로그인한다', async () => {
    await 로그인하기(game, driver, 새);
    await HUD이름뜰때까지(game, 새.아이디);
    const hud = new 공통HUD(game);
    await hud.골드가될때까지('200 G');
    await verify('캐릭터가 없는 계정으로 처음 로그인하면 골드가 「200 G」다', await hud.골드글(), '200 G');
  });
});
