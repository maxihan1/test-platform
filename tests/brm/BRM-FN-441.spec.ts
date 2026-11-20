import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 무기칸이될때까지 } from './helpers/login-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-441',
  name: '가방 창의 「장착」을 누르면 창이 바로 다시 그려져 녹슨 단검이 무기 칸에 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 녹슨 단검을 가지고 로비에 있다'],
  elements: ['item:녹슨 단검'],
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
  await test.step('일반 회원으로 로비에 들어가 녹슨 단검을 산다', async () => {
    await 로비로(game, driver, 나);
    const 상점 = await 상점창.열기(game);
    const 줄 = await 상점.줄찾기('녹슨 단검');
    await verify('상점에 녹슨 단검 줄이 있다', 줄 !== null, true, { blocker: true });
    await 상점.구매누르기(줄 ?? 0);
    const 샀다 = await 상점.hud.골드가될때까지('120 G');
    await verify('골드가 「120 G」다', 샀다, true, { blocker: true });
  });
  await test.step('가방 창에서 녹슨 단검 「장착」을 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    const 번호 = await 가방.줄찾기('녹슨 단검');
    await verify('가방에 녹슨 단검 줄이 있다', 번호 !== null, true, { blocker: true });
    await 가방.줄버튼누르기(번호 ?? 0, '장착');
    await 무기칸이될때까지(game, '녹슨 단검');
    const 무기칸 = (await 가방.칸내용('무기')) ?? '';
    await verify('가방 창의 「장착」을 누르면 창이 바로 다시 그려져 녹슨 단검이 무기 칸에 보인다', 무기칸.includes('녹슨 단검'), true);
  });
});
