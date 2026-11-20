import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 오른쪽위인가 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-531',
  name: '상점 창 오른쪽 위를 읽으면 상점 창 오른쪽 위에 「보유 골드 200」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['flow:골드-시작 지급'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('상점 창 오른쪽 위를 읽는다', async () => {
    const 상점 = await 상점창.열기(game);
    const 글 = await verify('상점 창에 「보유 골드 200」이 보인다', await 상점.보유골드글(), '보유 골드 200');
    const 자리 = await verify('「보유 골드 200」이 상점 창 오른쪽 위에 있다', await 오른쪽위인가(game, 상점창.보유골드줄, 상점창.판), true);
    await verify('상점 창 오른쪽 위를 읽으면 상점 창 오른쪽 위에 「보유 골드 200」이 보인다', 글 && 자리, true);
  });
});
