import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 고유이름 } from './helpers/auth.helper.js';
import { 추천태그지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-266',
  name: 'POST /api/v1/featured_tags 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  const 이름 = 고유이름('mti추천');
  let 번호 = '';
  try {
    await test.step('POST /api/v1/featured_tags 를 두 번째 사용자 토큰으로 부른다', async () => {
      const 응답 = await request.post('/api/v1/featured_tags', { headers: 머리(토큰), data: { name: 이름 } });
      if (응답.status() === 200) 번호 = ((await 응답.json()) as { id?: string }).id ?? '';
      await verify('POST /api/v1/featured_tags 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 추천태그지우기(request, 토큰, 번호);
  }
});
