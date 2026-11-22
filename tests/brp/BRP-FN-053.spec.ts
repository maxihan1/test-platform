import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 캐릭터있나 } from './helpers/mail-notice.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-053',
  name: '새 계정으로 처음 로그인하면 상단 바 캐릭터 이름이 로그인 아이디와 같다',
  platforms: ['windows'],
  precondition: ['새 계정의 캐릭터를 지워 두었다'],
  params: z.object({
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 새아이디 = params.newId ?? '';
  const 새비밀번호 = params.newPassword ?? '';

  await test.step('새 계정의 캐릭터를 지운다', async () => {
    await 계정되돌리기(admin, 새아이디, 새비밀번호, 'new');
    await verify('새 계정에 캐릭터가 없다', await 캐릭터있나(admin, 새아이디), false, { blocker: true });
  });

  await test.step('새 계정으로 처음 로그인한다', async () => {
    const 로비 = await 로그인하기(game, 새아이디, 새비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    const 화면 = await 로비화면.열림(game);
    await 화면.hud.그려질때까지();
    await verify('새 계정으로 처음 로그인하면 상단 바 캐릭터 이름이 로그인 아이디와 같다', 색글떼기(await 화면.hud.레벨이름()).endsWith(새아이디), true);
  });
});
