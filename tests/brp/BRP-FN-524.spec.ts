import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-524',
  name: '상점 창 오른쪽 위를 읽으면 상점 창 오른쪽 위에 「보유 골드」와 지금 골드가 보인다',
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

  await test.step('상점 창 오른쪽 위를 읽는다', async () => {
    const 상단골드 = await new 공통HUD(game).골드();
    const 상점 = await 상점창.열기(game);
    const 글 = 색글떼기(await 상점.보유골드글());
    const 보유 = await 상점.보유골드();
    await 상점.닫기();
    const 머리 = await verify('상점 창 오른쪽 위에 「보유 골드」가 보인다', 글.includes('보유 골드'), true);
    const 값 = await verify('상점 창 오른쪽 위에 지금 골드가 보인다', 보유, 상단골드);
    await verify('상점 창 오른쪽 위를 읽으면 상점 창 오른쪽 위에 「보유 골드」와 지금 골드가 보인다', 머리 && 값, true);
  });
});
