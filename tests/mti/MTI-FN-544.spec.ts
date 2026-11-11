import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-544',
  name: '검색에 음수 offset 을 보내면 응답 코드가 400 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
    오류문구머리: z.string().describe('오류 문구의 머리').default('Pagination values for'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('일반 회원 토큰으로 GET /api/v2/search?q=hana&offset=-1 을 부른다', async () => {
    const 응답 = await request.get('/api/v2/search?q=hana&offset=-1', { headers: 머리(토큰) });
    await verify('검색에 음수 offset 을 보내면 응답 코드가 400 이다', 응답.status(), expected.응답코드);
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('음수 offset 오류 문구가 「Pagination values for」 로 시작한다', (몸.error ?? '').startsWith(expected.오류문구머리), true);
  });
  await test.step('일반 회원 토큰으로 GET /api/v2/search?q=hana&limit=-1 을 부른다', async () => {
    const 응답 = await request.get('/api/v2/search?q=hana&limit=-1', { headers: 머리(토큰) });
    await verify('음수 limit 검색의 응답 코드가 400 이다', 응답.status(), expected.응답코드);
  });
});
