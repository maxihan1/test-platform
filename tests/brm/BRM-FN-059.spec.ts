import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { HUD이름뜰때까지, 가방줄이될때까지, 저장끝날때까지 } from './helpers/login-tools.helper.js';
import { 게임다시켜기, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-059',
  name: '시작 지급을 받은 캐릭터로 다시 로그인하면 시작 지급이 다시 들어오지 않아 체력 물약이 2개다',
  platforms: ['android'],
  precondition: ['새 계정이 처음 로그인해 시작 지급을 받았다'],
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
  await test.step('새 계정으로 처음 로그인한다', async () => {
    await 계정되돌리기(admin, 새, 'new');
    await 로그인하기(game, driver, 새);
    await HUD이름뜰때까지(game, 새.아이디);
    const 가방 = await 가방창.열기(game);
    const 번호 = await 가방.줄찾기('체력 물약');
    await verify('새 계정이 처음 로그인해 시작 지급을 받았다', 번호 === null ? null : await 가방.줄이름(번호), '체력 물약 x3', { blocker: true });
  });
  await test.step('물약 하나를 판 뒤 다시 로그인한다', async () => {
    const 가방 = await 가방창.열기(game);
    const 번호 = await 가방.줄찾기('체력 물약');
    await 가방.줄버튼누르기(번호 ?? 0, '판매');
    await verify('체력 물약 하나를 팔아 가방에 「체력 물약 x2」가 보인다', await 가방줄이될때까지(game, 번호 ?? 0, 'x2'), true, { blocker: true });
    await verify('판 값이 서버에 저장된다', await 저장끝날때까지(game), true, { blocker: true });
    await 게임다시켜기(game, driver);
    await 로그인하기(game, driver, 새);
    await HUD이름뜰때까지(game, 새.아이디);
    const 다시 = await 가방창.열기(game);
    const 다시번호 = await 다시.줄찾기('체력 물약');
    await verify('시작 지급을 받은 캐릭터로 다시 로그인하면 시작 지급이 다시 들어오지 않아 체력 물약이 2개다', 다시번호 === null ? null : await 다시.줄이름(다시번호), '체력 물약 x2');
  });
});
