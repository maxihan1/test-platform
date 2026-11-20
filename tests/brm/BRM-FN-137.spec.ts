import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 레벨값 } from './helpers/dungeon-tools.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 캐릭터 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-137',
  name: '캐릭터를 처음 만들면 상단 바에 「Lv. 1」이 보인다',
  platforms: ['android'],
  precondition: ['새 계정의 캐릭터가 지워져 있다'],
  elements: ['state:레벨=1'],
  params: z.object({
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 새계정 = 계정꺼내기(params.newId, params.newPassword, '새 계정');
  await test.cleanup('켜 둔 봇 끄기 · 새 계정 캐릭터 지우기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 새계정, 'new');
  });
  await test.step('새 계정의 캐릭터를 지운다', async () => {
    await 계정되돌리기(admin, 새계정, 'new');
    const 없음 = await 캐릭터(admin, 새계정.아이디).then(
      () => false,
      () => true,
    );
    await verify('새 계정의 캐릭터가 없다', 없음, true, { blocker: true });
  });
  await test.step('새 계정으로 처음 로그인한다', async () => {
    await 로그인하기(game, driver, 새계정);
    const 로비 = await 로비화면.열기(game);
    await verify('캐릭터를 처음 만들면 상단 바에 「Lv. 1」이 보인다', 레벨값(await 로비.hud.레벨글()), 1);
  });
});
