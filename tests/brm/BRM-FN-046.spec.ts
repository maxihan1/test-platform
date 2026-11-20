import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 시도글모으기 } from './helpers/login-tools.helper.js';
import { 지금화면, 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-046',
  name: '사유 없이 연결이 끊기면 다시 연결 시도가 「시도 2/2」까지 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  techniques: ['경계값 분석'],
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
  await test.step('와이파이를 끊어 사유 없이 연결을 끊는다', async () => {
    const 시도들 = await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
      await 안내창.제목이될때까지(game, '연결 끊김', 45_000);
      return 시도글모으기(game, '서버와 연결이 끊어졌습니다', 60_000);
    });
    await verify('사유 없이 연결이 끊기면 다시 연결 시도가 「시도 2/2」까지 보인다', 시도들.includes('시도 2/2'), true);
    await verify('다시 연결 시도에 「시도 3/2」은 보이지 않는다', !시도들.includes('시도 3/2'), true);
  });
});
