import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 소셜정리 } from './helpers/social.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-555',
  name: '채팅 창을 처음 열면 「전체」 탭이 골라져 있다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('게임을 켜 로그인한 뒤 처음으로 채팅 창을 연다', async () => {
    const 창 = await 채팅창.열기(game);
    const 밝기 = (c: number[]): number => (c[0] ?? 0) + (c[1] ?? 0) + (c[2] ?? 0);
    const 전체 = 밝기(await 창.탭색('전체'));
    const 파티 = await verify('「전체」 탭이 「파티」 탭보다 밝다', 전체 > 밝기(await 창.탭색('파티')), true);
    const 길드 = await verify('「전체」 탭이 「길드」 탭보다 밝다', 전체 > 밝기(await 창.탭색('길드')), true);
    await verify('채팅 창을 처음 열면 「전체」 탭이 골라져 있다', 파티 && 길드, true);
  });
});
