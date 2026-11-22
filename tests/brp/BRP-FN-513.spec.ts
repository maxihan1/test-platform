import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방요약 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-513',
  name: '가방 창 장착 칸을 읽으면 아무것도 장착하지 않은 장착 칸에 「비어 있음」이 보인다',
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

  await test.step('가방 창 장착 칸을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    const 글들: string[] = [];
    for (const 칸 of 가방창.장착칸들) 글들.push(색글떼기(await 가방.칸글(칸)));
    await 가방.닫기();
    await verify('가방 창 장착 칸을 읽으면 아무것도 장착하지 않은 장착 칸에 「비어 있음」이 보인다', 글들, ['비어 있음', '비어 있음', '비어 있음']);
  });
});
