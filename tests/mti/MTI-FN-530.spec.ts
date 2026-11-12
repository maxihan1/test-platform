import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 머리 } from './helpers/auth.helper.js';
import { 목록지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-530',
  name: 'JSON 본문으로 리스트를 만들면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 목록 = '';
  try {
    await test.step('JSON 본문으로 POST /api/v1/lists 를 보내 리스트를 만든다', async () => {
      const 응답 = await request.post('/api/v1/lists', { headers: 머리(토큰), data: { title: 고유이름('MTI 목록 ') } });
      await verify('JSON 본문으로 리스트를 만들면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
      목록 = ((await 응답.json()) as { id?: string }).id ?? '';
    });
  } finally {
    await 목록지우기(request, 토큰, 목록);
  }
});
