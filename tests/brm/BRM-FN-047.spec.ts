import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 안내창에글뜸 } from './helpers/login-tools.helper.js';
import { 지금화면, 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-047',
  name: '와이파이를 끊으면 「시도 1/2」에서 「시도 2/2」로 넘어가기까지 5초 안팎이 걸린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    오차초: z.number().min(0).describe('걸린 시간 오차(초) — 5초 안팎으로 보는 폭').default(2),
  }),
  expected: z.object({
    걸리는초: z.number().describe('「시도 1/2」에서 「시도 2/2」로 넘어가기까지 걸리는 시간(초)').default(5),
  }),
});

test(spec, async ({ game, driver, admin, params, expected }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('일반 회원으로 로비에 들어와 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('와이파이를 끊어 다시 연결 시도를 지켜본다', async () => {
    const 결과 = await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
      const 첫 = await 안내창에글뜸(game, '시도 1', 45_000);
      const 시작 = Date.now();
      const 둘째 = await 안내창에글뜸(game, '시도 2', 30_000);
      return { 첫, 둘째, 초: (Date.now() - 시작) / 1000 };
    });
    const 첫 = await verify('「시도 1/2」이 보인다', 결과.첫, true);
    const 둘째 = await verify('「시도 2/2」로 넘어간다', 결과.둘째, true);
    await verify('와이파이를 끊으면 「시도 1/2」에서 「시도 2/2」로 넘어가기까지 5초 안팎이 걸린다', 첫 && 둘째 && Math.abs(결과.초 - expected.걸리는초) <= params.오차초, true);
  });
});
