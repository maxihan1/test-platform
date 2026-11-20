import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 상점줄, 확인창떴나 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-213',
  name: '「구매」를 누르면 확인 창 없이 바로 산다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['item:체력 물약', 'shop:체력 물약', 'flow:골드-상점 구매'],
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
  await test.step('체력 물약 줄의 「구매」를 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매누르기(await 상점줄(상점, '체력 물약'));
    const 샀다 = await verify('「체력 물약 1개 구매」 알림이 바로 뜬다', await hud.알림뜸('체력 물약 1개 구매'), true);
    const 창없음 = await verify('확인 창이 뜨지 않는다', await 확인창떴나(game, '상점'), false);
    await verify('「구매」를 누르면 확인 창 없이 바로 산다', 샀다 && 창없음, true);
  });
});
