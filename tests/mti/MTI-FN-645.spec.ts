import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 설문글쓰기 } from './helpers/post.helper.js';
import { 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-645',
  name: '내 설문에 투표하면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원이 쓴 설문이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
    오류문구: z.string().describe('내 설문에 투표할 때 오류 문구에 있어야 할 말').default('자신이 만든 설문에는 투표할 수 없음'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 설문 = await 설문글쓰기(request, 토큰);
  try {
    await test.step('시험 설문 번호를 확인한다', async () => {
      await verify('일반 회원이 쓴 설문이 있다', 설문.설문 !== '', true, { blocker: true });
    });
    await test.step('일반 회원이 자기 설문에 투표한다', async () => {
      const 응답 = await request.post(`/api/v1/polls/${설문.설문}/votes`, { headers: 머리(토큰), data: { choices: [0] } });
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('내 설문에 투표하면 응답 코드가 422 다', 응답.status(), expected.응답코드);
      await verify('오류 문구가 「자신이 만든 설문에는 투표할 수 없음」 이다', (몸.error ?? '').includes(expected.오류문구), true);
    });
  } finally {
    await 글지우기(request, 토큰, 설문.글);
  }
});
