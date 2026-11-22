import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 장비끼기 } from './helpers/items.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { GM골드, GM레벨, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-466',
  name: '레벨 5 에 「사슬 갑옷」을 끼면 방어율이 0.01 × 4 + 0.15 = 0.19 다',
  platforms: ['windows'],
  precondition: ['일반 회원이 레벨 5 로 「사슬 갑옷」을 장착하고 로비에 있다'],
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

  await test.step('레벨 5 로 「사슬 갑옷」을 장착한다', async () => {
    await GM레벨(game, 5);
    await GM골드(game, 5000);
    await 장비끼기(game, '사슬 갑옷');
    const 가방 = await 가방창.열기(game);
    await verify('갑옷 칸에 「사슬 갑옷」이 보인다', await 가방.칸이될때까지('갑옷', '사슬 갑옷'), true, { blocker: true });
    await 가방.닫기();
  });

  await test.step('/gm stat 으로 방어율을 읽는다', async () => {
    const 값 = await GM스탯(game);
    await verify('레벨 5 에 「사슬 갑옷」을 끼면 방어율이 0.01 × 4 + 0.15 = 0.19 다', 스탯숫자(값, '방어율'), 0.19);
  });
});
