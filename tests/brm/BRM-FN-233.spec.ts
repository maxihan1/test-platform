import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-233',
  name: '상점 창과 가방 창의 버튼을 보면 판매 버튼은 가방 창 줄에 「판매 7G」로 있고 상점 창에는 판매 버튼이 없다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['item:체력 물약', 'flow:골드-판매'],
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
  await test.step('상점 창과 가방 창의 버튼을 본다', async () => {
    const 가방 = await 가방창.열기(game);
    const 판매 = await verify('가방 창 체력 물약 줄에 「판매 7G」가 있다', await 가방.판매버튼글(await 가방줄(가방, '체력 물약')), '판매 7G');
    const 상점 = await 상점창.열기(game);
    const 상점없음 = await verify('상점 창에는 판매 버튼이 없다', await 상점.판매버튼있나(), false);
    await verify('상점 창과 가방 창의 버튼을 보면 판매 버튼은 가방 창 줄에 「판매 7G」로 있고 상점 창에는 판매 버튼이 없다', 판매 && 상점없음, true);
  });
});
