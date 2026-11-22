import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 알림이모두사라질때까지 } from './helpers/items.helper.js';
import { type 색, 어두운빨강인가, 연분홍인가 } from './helpers/screen-check.helper.js';
import { 알림띠 } from './components/toast.component.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-441',
  name: '가방 창에서 체력 물약 「사용」을 눌러 오류 알림을 띄우면 오류 알림은 바탕이 어두운 빨강이다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
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

  await test.step('가방 창에서 체력 물약 「사용」을 눌러 오류 알림을 띄운다', async () => {
    await 알림이모두사라질때까지(game);
    const 가방 = await 가방창.열기(game);
    await 가방.사용하기('체력 물약');
    const 색들 = await new 알림띠(game).첫줄색();
    await verify('오류 알림이 뜬다', 색들 !== null, true, { blocker: true });
    await verify('가방 창에서 체력 물약 「사용」을 눌러 오류 알림을 띄우면 오류 알림은 바탕이 어두운 빨강이다', 어두운빨강인가((색들?.바탕 ?? null) as 색 | null), true);
    await verify('오류 알림 글씨는 연분홍이다', 연분홍인가((색들?.글 ?? null) as 색 | null), true);
  });
});
