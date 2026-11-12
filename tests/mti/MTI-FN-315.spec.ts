import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 첫공개글 } from './helpers/status.helper.js';
import { 필터만들기, 필터지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-315',
  name: 'POST /api/v2/filters/{filter_id}/statuses 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 만든 필터와 시드 공개 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  let 번호2 = '';
  번호 = (await 필터만들기(request, 토큰)).id;
  번호2 = await 첫공개글(request, 'hana_photo');
  try {
    await test.step('시험 필터 번호를 확인한다', async () => {
      await verify('일반 회원이 만든 필터와 시드 공개 글이 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('POST /api/v2/filters/{filter_id}/statuses 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.post(`/api/v2/filters/${번호}/statuses`, { headers: 머리(토큰), data: { status_id: 번호2 } });
      await verify('POST /api/v2/filters/{filter_id}/statuses 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 필터지우기(request, 토큰, 번호);
  }
});
