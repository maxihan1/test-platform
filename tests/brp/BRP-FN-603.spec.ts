import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-603',
  name: '영웅 카드를 누르면 그 카드의 바탕이 켜져 고른 카드로 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['zone:CharSelect', 'state:직업=탱커'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));
  const 자리 = 로비화면.직업자리['탱커'];

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await verify('카드를 누르기 전에는 탱커 카드 바탕이 꺼져 있다', await (await 로비화면.열림(game)).자리바탕있나(자리), false, { blocker: true });
  });

  await test.step('탱커 카드를 누른다', async () => {
    const 로비 = await 로비화면.열림(game);
    await 로비.직업고르기('탱커');
    await verify('영웅 카드를 누르면 그 카드의 바탕이 켜져 고른 카드로 보인다', await 로비.자리바탕켜질때까지(자리), true);
  });
});
