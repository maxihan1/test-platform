import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 큰알림수명재기 } from './helpers/login-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 경험치주기, 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-637',
  name: '「/gm exp 100」을 보내고 큰 알림이 사라질 때까지 재면 큰 알림 「레벨 업!」은 2.2초 안팎에 사라진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['level:1', 'level:2'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    오차초: z.number().min(0).describe('시간 오차(초)').default(2),
  }),
  expected: z.object({
    사라지는시간초: z.number().describe('큰 알림이 사라질 때까지 걸리는 시간(초)').default(2.2),
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
  await test.step('「/gm exp 100」을 보내고 큰 알림이 사라질 때까지 잰다', async () => {
    const [, 수명] = await Promise.all([경험치주기(game, 100), 큰알림수명재기(game, '레벨 업!')]);
    await verify('큰 알림 「레벨 업!」이 뜬다', 수명.뜸, true, { blocker: true });
    await verify('「/gm exp 100」을 보내고 큰 알림이 사라질 때까지 재면 큰 알림 「레벨 업!」은 2.2초 안팎에 사라진다', Math.abs(수명.초 - expected.사라지는시간초) <= params.오차초, true);
  });
});
