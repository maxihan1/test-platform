import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 목록지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-563',
  name: '제목 없이 리스트를 만들면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 목록 = '';
  try {
    await test.step('title 을 비워 POST /api/v1/lists 를 부른다', async () => {
      const 응답 = await request.post('/api/v1/lists', { headers: 머리(토큰), data: { title: '' } });
      await verify('제목 없이 리스트를 만들면 응답 코드가 422 다', 응답.status(), expected.응답코드);
      목록 = ((await 응답.json()) as { id?: string }).id ?? '';
    });
  } finally {
    await 목록지우기(request, 토큰, 목록);
  }
});
