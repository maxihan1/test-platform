import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문글, 운영자토큰, 인증헤더 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-029',
  name: '운영자 토큰으로 /api 데이터 API 를 부르면 401 이고 본문이 비어 있다',
  apiDoc: 2,
  precondition: ['「운영자」 계정이 있다'],
  params: z.object({
    opsId: z.string().describe('운영자 아이디').optional().meta({ secret: true, account: '운영자' }),
    opsPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true, account: '운영자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('「운영자」 토큰으로 POST /api/getguilds 를 부른다', async () => {
    const 받음 = await 운영자토큰(request, params.opsId ?? '', params.opsPassword ?? '');
    await verify('「운영자」 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
    const 응답 = await request.post('/api/getguilds', { headers: 인증헤더(받음.token), data: {} });
    const 코드 = await verify('/api/getguilds 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('/api/getguilds 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('운영자 토큰으로 /api 데이터 API 를 부르면 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
});
