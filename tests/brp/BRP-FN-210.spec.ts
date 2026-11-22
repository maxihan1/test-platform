import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-210',
  name: '골드가 충분할 때 「녹슨 단검」을 사면 골드가 가격 80 만큼 줄어 「120 G」가 된다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['일반 회원 골드가 200 이다'],
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

  await test.step('상점 「녹슨 단검」 줄의 「구매」를 누른다', async () => {
    const 상단 = new 공통HUD(game);
    const 상점 = await 상점창.열기(game);
    await 상점.구매하기('녹슨 단검');
    await 상점.닫기();
    await 상단.골드가될때까지(120);
    await verify('골드가 충분할 때 「녹슨 단검」을 사면 골드가 가격 80 만큼 줄어 「120 G」가 된다', await 상단.골드글(), '120 G');
  });
});
