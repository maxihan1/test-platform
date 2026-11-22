import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 장비끼기 } from './helpers/items.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { GM골드, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-471',
  name: '「현자의 목걸이」를 끼면 경험치 배율이 1 + 0.2 = 1.2 다',
  platforms: ['windows'],
  precondition: ['일반 회원이 「현자의 목걸이」를 장착하고 로비에 있다'],
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

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('「현자의 목걸이」를 장착한다', async () => {
    await GM골드(game, 5000);
    await 장비끼기(game, '현자의 목걸이');
    const 가방 = await 가방창.열기(game);
    await verify('장신구 칸에 「현자의 목걸이」이 보인다', await 가방.칸이될때까지('장신구', '현자의 목걸이'), true, { blocker: true });
    await 가방.닫기();
  });

  await test.step('/gm stat 으로 경험치 배율을 읽는다', async () => {
    const 값 = await GM스탯(game);
    await verify('「현자의 목걸이」를 끼면 경험치 배율이 1 + 0.2 = 1.2 다', 스탯숫자(값, '경험치배율'), 1.2);
  });
});
