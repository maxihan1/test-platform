import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문JSON, 토큰본문 } from './helpers/api.helper.js';
import { 서버로그인 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-022',
  name: '게임 서버 토큰을 열면 sharedSecret 칸에 보낸 공유 비밀이 그대로 들어 있다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('맞는 공유 비밀로 POST /api/serverlogin 을 불러 받은 토큰 본문을 읽는다', async () => {
    const 응답 = await 서버로그인(request, params.serverPassword ?? '');
    await verify('게임 서버 로그인 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 몸 = await 본문JSON<{ token: string }>(응답);
    const 칸 = 토큰본문(몸.token)['sharedSecret'];
    await verify('게임 서버 토큰을 열면 sharedSecret 칸에 보낸 공유 비밀이 그대로 들어 있다', 칸 === (params.serverPassword ?? ''), true);
  });
});
