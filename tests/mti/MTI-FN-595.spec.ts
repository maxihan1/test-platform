import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 머리 } from './helpers/auth.helper.js';
import { 글쓰기, 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-595',
  name: '글을 지우면 응답의 text 가 쓴 글과 같다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 쓴 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 내용 = `MTI 지울 글 ${고유이름('')}`;
  const 번호 = await 글쓰기(request, 토큰, { status: 내용 });
  try {
    await test.step('시험 글 번호를 확인한다', async () => {
      await verify('일반 회원이 쓴 글이 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('DELETE /api/v1/statuses/{id} 로 글을 지운다', async () => {
      const 응답 = await request.delete(`/api/v1/statuses/${번호}`, { headers: 머리(토큰) });
      const 몸 = (await 응답.json()) as { text?: string };
      await verify('글을 지우면 응답의 text 가 쓴 글과 같다', 몸.text, 내용);
      await verify('응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글지우기(request, 토큰, 번호);
  }
});
