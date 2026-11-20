import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 시도글읽기, 안내창에글뜸 } from './helpers/login-tools.helper.js';
import { 지금화면, 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-048',
  name: '와이파이를 끊으면 다시 연결을 시도하는 동안 「연결 끊김」 창에 「다시 연결하는 중…」과 「시도 1/2」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('일반 회원으로 로비에 들어와 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('와이파이를 끊는다', async () => {
    const 결과 = await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
      const 제목 = await 안내창.제목이될때까지(game, '연결 끊김', 45_000);
      const 다시 = await 안내창에글뜸(game, '다시 연결하는 중…', 15_000);
      const 시도 = (await 안내창에글뜸(game, '시도 1', 15_000)) && ((await 시도글읽기(game)) ?? '').includes('시도 1/2');
      return { 제목, 다시, 시도 };
    });
    const 제목 = await verify('「연결 끊김」 창이 보인다', 결과.제목, true);
    const 다시 = await verify('「다시 연결하는 중…」이 보인다', 결과.다시, true);
    const 시도 = await verify('「시도 1/2」이 보인다', 결과.시도, true);
    await verify('와이파이를 끊으면 다시 연결을 시도하는 동안 「연결 끊김」 창에 「다시 연결하는 중…」과 「시도 1/2」이 보인다', 제목 && 다시 && 시도, true);
  });
});
