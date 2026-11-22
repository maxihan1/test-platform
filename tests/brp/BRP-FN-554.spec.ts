import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-554',
  name: '채팅 창 탭을 읽으면 채팅 창 탭은 「전체」 · 「파티」 · 「길드」다',
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

  await test.step('채팅 창 탭을 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    const 전체탭 = await verify('채팅 창 탭에 「전체」가 보인다', await 창.탭글('전체'), '전체');
    const 파티탭 = await verify('채팅 창 탭에 「파티」가 보인다', await 창.탭글('파티'), '파티');
    const 길드탭 = await verify('채팅 창 탭에 「길드」가 보인다', await 창.탭글('길드'), '길드');
    await verify('채팅 창 탭을 읽으면 채팅 창 탭은 「전체」 · 「파티」 · 「길드」다', 전체탭 && 파티탭 && 길드탭, true);
  });

  await test.step('「파티」 탭을 누르고 탭 색을 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.탭고르기('파티');
    const 밝기 = (c: number[]): number => (c[0] ?? 0) + (c[1] ?? 0) + (c[2] ?? 0);
    const 파티 = 밝기(await 창.탭색('파티'));
    const 전체 = 밝기(await 창.탭색('전체'));
    const 길드 = 밝기(await 창.탭색('길드'));
    const 전체어둠 = await verify('고르지 않은 「전체」 탭이 「파티」 탭보다 어둡다', 전체 < 파티, true);
    const 길드어둠 = await verify('고르지 않은 「길드」 탭이 「파티」 탭보다 어둡다', 길드 < 파티, true);
    await verify('고른 탭은 밝게, 나머지 탭은 어둡게 보인다', 전체어둠 && 길드어둠, true);
  });
});
