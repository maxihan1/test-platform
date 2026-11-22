import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에서팔기, 가방줄들 } from './helpers/mail-notice.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-059',
  name: '시작 지급을 받은 새 계정으로 다시 로그인하면 체력 물약이 다시 채워지지 않고 「x2」 그대로다',
  platforms: ['windows'],
  precondition: ['새 계정이 시작 지급을 한 번 받았고 체력 물약 1개를 팔았다'],
  params: z.object({
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 새아이디 = params.newId ?? '';
  const 새비밀번호 = params.newPassword ?? '';

  await test.step('새 계정으로 처음 로그인해 체력 물약 1개를 판다', async () => {
    await 계정되돌리기(admin, 새아이디, 새비밀번호, 'new');
    const 접속 = await 로그인하기(game, 새아이디, 새비밀번호);
    await verify('로비 화면이 열린다', 접속 !== null, true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await 로비.hud.그려질때까지();
    await 가방에서팔기(game, '체력 물약');
    const 줄 = (await 가방줄들(game)).find((글) => 글.includes('체력 물약'));
    await verify('체력 물약이 「x2」로 줄었다', (줄 ?? '').includes('x2'), true, { blocker: true });
  });

  await test.step('새 계정으로 다시 로그인하고 가방을 연다', async () => {
    await game.restart();
    const 접속 = await 로그인하기(game, 새아이디, 새비밀번호);
    await verify('로비 화면이 다시 열린다', 접속 !== null, true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await 로비.hud.그려질때까지();
    const 줄 = (await 가방줄들(game)).find((글) => 글.includes('체력 물약'));
    await verify('시작 지급을 받은 새 계정으로 다시 로그인하면 체력 물약이 다시 채워지지 않고 「x2」 그대로다', (줄 ?? '').includes('x2'), true);
  });
});
