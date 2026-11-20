import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상점줄구매, 토스트모두사라질때까지, 토스트수명재기 } from './helpers/login-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-636',
  name: '체력 물약을 하나 사고 알림이 사라질 때까지 재면 알림은 3.5초 안팎에 사라진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['shop:체력 물약'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    오차초: z.number().min(0).describe('시간 오차(초)').default(2),
  }),
  expected: z.object({
    사라지는시간초: z.number().describe('알림이 사라질 때까지 걸리는 시간(초)').default(3.5),
  }),
});

test(spec, async ({ game, driver, admin, params, expected }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('체력 물약을 하나 사고 알림이 사라질 때까지 잰다', async () => {
    await 토스트모두사라질때까지(game);
    const 상점 = await 상점창.열기(game);
    await 상점줄구매(game, 상점, '체력 물약');
    const 수명 = await 토스트수명재기(game);
    await verify('알림이 뜬다', 수명.뜸, true, { blocker: true });
    await verify('체력 물약을 하나 사고 알림이 사라질 때까지 재면 알림은 3.5초 안팎에 사라진다', Math.abs(수명.초 - expected.사라지는시간초) <= params.오차초, true);
  });
});
