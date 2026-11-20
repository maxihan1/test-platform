import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 퀘스트처음으로 } from './helpers/game-state.helper.js';
import { 사기 } from './helpers/items-tools.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-538',
  name: '「/gm quest reset」 뒤 체력 물약을 사고 퀘스트 창을 열면 목표를 채우고 보상을 안 받은 「상점에서 물건 구매」 줄은 바탕이 옅은 금색이다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['quest:상점에서 물건 구매'],
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    const 창 = await 퀘스트창.열기(game);
    await verify('퀘스트 줄이 3줄이다', await 창.줄수(), 3, { blocker: true });
  });
  await test.step('「/gm quest reset」 뒤 체력 물약을 사고 퀘스트 창을 연다', async () => {
    await 퀘스트처음으로(game);
    await 사기(game, '체력 물약');
    const 창 = await 퀘스트창.열기(game);
    await 창.줄진행이될때까지(2, '1/1');
    const [r = 0, g = 0, b = 0, a = 0] = await 창.줄바탕색(2);
    await verify('「/gm quest reset」 뒤 체력 물약을 사고 퀘스트 창을 열면 목표를 채우고 보상을 안 받은 「상점에서 물건 구매」 줄은 바탕이 옅은 금색이다', r > 0.4 && g > 0.3 && b < g && r >= g && a > 0, true);
  });
});
