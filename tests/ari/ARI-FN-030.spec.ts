import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자토큰, 인증헤더 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-030',
  name: '운영자 토큰으로 GET /opsapi/summary 를 부르면 200 이다',
  apiDoc: 2,
  precondition: ['「운영자」 계정이 있다'],
  params: z.object({
    opsId: z.string().describe('운영자 아이디').optional().meta({ secret: true, account: '운영자' }),
    opsPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true, account: '운영자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('「운영자」 토큰으로 GET /opsapi/summary 를 부른다', async () => {
    const 받음 = await 운영자토큰(request, params.opsId ?? '', params.opsPassword ?? '');
    await verify('「운영자」 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
    const 응답 = await request.get('/opsapi/summary', { headers: 인증헤더(받음.token) });
    await verify('운영자 토큰으로 GET /opsapi/summary 를 부르면 200 이다', 응답.status(), expected.응답코드);
  });
});
