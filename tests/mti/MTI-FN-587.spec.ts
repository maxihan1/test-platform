import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기, 가입하기 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-587',
  name: '방금 가입한 계정 토큰으로 홈 타임라인을 부르면 서버 오류(5xx) 없이 응답한다',
  apiDoc: 1,
  precondition: ['방금 가입한 계정이 있다'],
  params: null,
  expected: z.object({
    서버오류없음: z.boolean().describe('서버 오류(5xx) 없이 응답하는지').default(true),
  }),
});

test(spec, async ({ request, admin, expected }) => {
  const 계정 = await 가입하기(request);
  try {
    await test.step('방금 가입한 계정을 확인한다', async () => {
      await verify('방금 가입한 계정이 있다', 계정.token !== '', true, { blocker: true });
    });
    await test.step('방금 가입한 계정 토큰으로 GET /api/v1/timelines/home 을 부른다', async () => {
      const 응답 = await request.get('/api/v1/timelines/home', { headers: 머리(계정.token) });
      await verify('방금 가입한 계정 토큰으로 홈 타임라인을 부르면 서버 오류(5xx) 없이 응답한다', 응답.status() < 500, expected.서버오류없음);
    });
  } finally {
    await 가입계정지우기(admin, 계정.username);
  }
});
