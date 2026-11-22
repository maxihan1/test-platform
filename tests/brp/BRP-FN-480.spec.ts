import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 알림글읽기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-480',
  name: '처음 받은 200 골드로 「행운의 반지」를 사면 오류 알림 「골드가 부족합니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원 골드가 처음 받은 200 이다'],
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

  await test.step('일반 회원 골드가 200 인 것을 확인한다', async () => {
    await verify('골드가 200 이다', await new 공통HUD(game).골드(), 200, { blocker: true });
  });

  await test.step('상점에서 「행운의 반지」를 산다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매하기('행운의 반지');
    const 글 = await 알림글읽기(game, '골드가 부족합니다');
    await 상점.닫기();
    await verify('처음 받은 200 골드로 「행운의 반지」를 사면 오류 알림 「골드가 부족합니다」가 뜬다', 글 !== null, true);
  });
});
