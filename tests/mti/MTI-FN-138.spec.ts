import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 글쓰기, 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-138',
  name: 'POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 쓴 글이 있다', '일반 회원이 그 글을 인용한 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    인용상태: z.string().describe('취소한 뒤 인용 상태').default('revoked'),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 원본 = await 글쓰기(request, 토큰);
  const 인용글 = await 글쓰기(request, 토큰, { quoted_status_id: 원본 });
  try {
    await test.step('시험 글과 인용 글 번호를 확인한다', async () => {
      await verify('일반 회원이 쓴 글이 있다', 원본 !== '', true, { blocker: true });
      await verify('일반 회원이 그 글을 인용한 글이 있다', 인용글 !== '', true, { blocker: true });
    });
    await test.step('POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.post(`/api/v1/statuses/${원본}/quotes/${인용글}/revoke`, { headers: 머리(토큰) });
      await verify('POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
      const 몸 = (await 응답.json()) as { quote?: { state?: string } | null };
      await verify('응답한 인용 글의 quote.state 가 revoked 다', 몸.quote?.state, expected.인용상태);
    });
  } finally {
    await 글지우기(request, 토큰, 인용글);
    await 글지우기(request, 토큰, 원본);
  }
});
