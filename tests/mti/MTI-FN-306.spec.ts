import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 없는번호 } from './helpers/auth.helper.js';
import { 필터만들기, 필터지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-306',
  name: 'POST /api/v2/filters/{filter_id}/keywords 를 토큰 없이 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다', '일반 회원 토큰이 있다', '일반 회원이 만든 필터가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    토큰없음응답코드: z.number().describe('토큰 없이 부를 때 응답 코드').default(401),
    없는번호응답코드: z.number().describe('없는 번호로 부를 때 응답 코드').default(404),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  번호 = (await 필터만들기(request, 토큰)).id;
  try {
    await test.step('시험 필터 번호를 확인한다', async () => {
      await verify('일반 회원이 만든 필터가 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('POST /api/v2/filters/{filter_id}/keywords 를 토큰 없이 부른다', async () => {
      const 응답 = await request.post(`/api/v2/filters/${번호}/keywords`, { data: { keyword: 'mti더한낱말', whole_word: true } });
      await verify('POST /api/v2/filters/{filter_id}/keywords 를 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
    });
    await test.step('POST /api/v2/filters/{filter_id}/keywords 를 없는 번호로 부른다', async () => {
      const 응답 = await request.post(`/api/v2/filters/${없는번호}/keywords`, { headers: 머리(토큰), data: { keyword: 'mti더한낱말', whole_word: true } });
      await verify('POST /api/v2/filters/{filter_id}/keywords 를 없는 번호로 부른 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
    });
  } finally {
    await 필터지우기(request, 토큰, 번호);
  }
});
