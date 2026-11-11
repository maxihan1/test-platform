import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 첫공개글 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-700',
  name: '부록 B 의 GET /api/v1/statuses/{id}/card 를 부르면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '일반 회원 토큰이 있다', '시드 계정 hana_photo 의 공개 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 글 = await 첫공개글(request, 'hana_photo');
  await test.step('시험할 글 번호를 확인한다', async () => {
    await verify('시드 계정 hana_photo 의 공개 글이 있다', 글 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/statuses/{id}/card 를 부른다', async () => {
    const 응답 = await request.get(`/api/v1/statuses/${글}/card`);
    await verify('부록 B 의 GET /api/v1/statuses/{id}/card 를 부르면 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
  await test.step('GET /api/v1/search?q=hana 를 부른다', async () => {
    const 응답 = await request.get('/api/v1/search?q=hana');
    await verify('GET /api/v1/search 의 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
  await test.step('일반 회원 토큰으로 GET /api/v1/timelines/direct 를 부른다', async () => {
    const 응답 = await request.get('/api/v1/timelines/direct', { headers: 머리(토큰) });
    await verify('GET /api/v1/timelines/direct 의 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
});
