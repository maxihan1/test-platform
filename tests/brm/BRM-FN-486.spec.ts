import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 상점줄, 알림사라질때까지 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-486',
  name: '시작 골드 200 으로 300 골드짜리 현자의 목걸이를 사려 하면 「골드가 부족합니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['shop:현자의 목걸이', 'shop:행운의 반지', 'flow:골드-상점 구매'],
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
  await test.step('현자의 목걸이 줄의 「구매」를 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매누르기(await 상점줄(상점, '현자의 목걸이'));
    await verify('시작 골드 200 으로 300 골드짜리 현자의 목걸이를 사려 하면 「골드가 부족합니다」 오류 알림이 뜬다', await hud.알림뜸('골드가 부족합니다'), true);
  });
  await test.step('행운의 반지 줄의 「구매」를 누른다', async () => {
    await 알림사라질때까지(game, '골드가 부족합니다');
    const 상점 = await 상점창.열기(game);
    await 상점.구매누르기(await 상점줄(상점, '행운의 반지'));
    await verify('「골드가 부족합니다」 오류 알림이 뜬다', await hud.알림뜸('골드가 부족합니다'), true);
  });
});
