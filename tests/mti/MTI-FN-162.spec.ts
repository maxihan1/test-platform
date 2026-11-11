import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 없는번호 } from './helpers/auth.helper.js';
import { 첫공개글 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-162',
  name: 'POST /api/v1/statuses/{id}/translate 를 토큰 없이 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다', '일반 회원 토큰이 있다', '시드 계정 hana_photo 의 공개 글이 있다'],
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
  번호 = await 첫공개글(request, 'hana_photo');
  await test.step('준비한 번호를 확인한다', async () => {
    await verify('시드 계정 hana_photo 의 공개 글이 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('POST /api/v1/statuses/{id}/translate 를 토큰 없이 부른다', async () => {
    const 응답 = await request.post(`/api/v1/statuses/${번호}/translate`, { data: { lang: 'en' } });
    await verify('POST /api/v1/statuses/{id}/translate 를 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
  });
  await test.step('POST /api/v1/statuses/{id}/translate 를 없는 번호로 부른다', async () => {
    const 응답 = await request.post(`/api/v1/statuses/${없는번호}/translate`, { headers: 머리(토큰), data: { lang: 'en' } });
    await verify('POST /api/v1/statuses/{id}/translate 를 없는 번호로 부른 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
  });
});
