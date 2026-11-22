import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 창열기 } from './helpers/dungeon.helper.js';
import { 창닫힘기다리기, 창열려있나 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-432',
  name: '다른 창이 열린 채 메뉴 「상점」을 누르면 상점 창이 열리고 앞서 연 가방 창은 닫힌다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('메뉴 「가방」을 눌러 가방 창을 연 채 메뉴 「상점」을 누른다', async () => {
    await 창열기(game, '가방');
    await verify('가방 창이 열린다', await 창열려있나(game, '가방'), true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await 로비.hud.메뉴누르기('상점');
    const 상점 = await verify('상점 창이 열린다', await 창열려있나(game, '상점'), true);
    const 가방 = await verify('앞서 연 가방 창은 닫힌다', await 창닫힘기다리기(game, '가방'), true);
    await verify('다른 창이 열린 채 메뉴 「상점」을 누르면 상점 창이 열리고 앞서 연 가방 창은 닫힌다', 상점 && 가방, true);
  });
});
