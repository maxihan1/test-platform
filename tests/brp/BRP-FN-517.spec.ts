import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방요약 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-517',
  name: '가방 창 능력 줄을 읽으면 장착 칸 아래 능력 줄에 「Lv.」와 「골드」가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 가방이 기준 상태(체력 물약 3)다'],
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

  await test.step('가방이 기준 상태인 것을 확인한다', async () => {
    await verify('가방에 체력 물약 3개만 있다', await 가방요약(game), '체력 물약 x3', { blocker: true });
  });

  await test.step('가방 창 능력 줄을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    const 글 = 색글떼기(await 가방.능력줄글());
    await 가방.닫기();
    const 레벨 = await verify('능력 줄에 「Lv.」가 보인다', 글.includes('Lv.'), true);
    const 골드 = await verify('능력 줄에 「골드」가 보인다', 글.includes('골드'), true);
    await verify('가방 창 능력 줄을 읽으면 장착 칸 아래 능력 줄에 「Lv.」와 「골드」가 보인다', 레벨 && 골드, true);
  });
});
