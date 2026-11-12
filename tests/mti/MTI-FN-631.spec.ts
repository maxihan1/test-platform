import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 첫공개글 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-631',
  name: '번역이 꺼진 서버에서 글을 번역하면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '시드 계정 hana_photo 의 공개 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 번호 = await 첫공개글(request, 'hana_photo');
  await test.step('시드 계정 hana_photo 의 공개 글을 확인한다', async () => {
    await verify('시드 계정 hana_photo 의 공개 글이 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('일반 회원 토큰으로 공개 글을 POST /api/v1/statuses/{id}/translate 로 번역한다', async () => {
    const 응답 = await request.post(`/api/v1/statuses/${번호}/translate`, { headers: 머리(토큰) });
    await verify('번역이 꺼진 서버에서 글을 번역하면 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
});
