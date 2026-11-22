import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방요약 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-511',
  name: '가방 창 왼쪽을 읽으면 가방 창 왼쪽 「장착 중」에 「무기」 · 「갑옷」 · 「장신구」 칸 셋이 보인다',
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

  await test.step('가방 창 왼쪽을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    const 머리 = 색글떼기(await 가방.장착중글읽기());
    const 칸들: string[] = [];
    for (const 칸 of 가방창.장착칸들) 칸들.push(색글떼기(await 가방.칸이름글(칸)));
    await 가방.닫기();
    const 장착중 = await verify('「장착 중」 글이 보인다', 머리.includes('장착 중'), true);
    const 칸셋 = await verify('「무기」 · 「갑옷」 · 「장신구」 칸 셋이 보인다', 칸들, ['무기', '갑옷', '장신구']);
    await verify('가방 창 왼쪽을 읽으면 가방 창 왼쪽 「장착 중」에 「무기」 · 「갑옷」 · 「장신구」 칸 셋이 보인다', 장착중 && 칸셋, true);
  });
});
