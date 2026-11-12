import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 설문글쓰기, 투표하기 } from './helpers/post.helper.js';
import { 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-643',
  name: '단일 선택 설문에 다시 투표하면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원이 쓴 단일 선택 설문에 두 번째 사용자가 투표해 두었다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    첫투표응답코드: z.number().describe('처음 투표할 때 응답 코드').default(200),
    응답코드: z.number().describe('다시 투표할 때 응답 코드').default(422),
    오류문구: z.string().describe('다시 투표할 때 오류 문구에 있어야 할 말').default('이미 참여한 설문'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 토큰2 = params.user2Password ?? '';
  const 설문 = await 설문글쓰기(request, 토큰);
  const 첫투표 = await 투표하기(request, 토큰2, 설문.설문, [0]);
  try {
    await test.step('두 번째 사용자의 첫 투표를 확인한다', async () => {
      await verify('일반 회원이 쓴 단일 선택 설문에 두 번째 사용자가 투표해 두었다', 첫투표, expected.첫투표응답코드, { blocker: true });
    });
    await test.step('두 번째 사용자가 같은 설문에 다시 투표한다', async () => {
      const 응답 = await request.post(`/api/v1/polls/${설문.설문}/votes`, { headers: 머리(토큰2), data: { choices: [1] } });
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('단일 선택 설문에 다시 투표하면 응답 코드가 422 다', 응답.status(), expected.응답코드);
      await verify('오류 문구가 「이미 참여한 설문」 이다', (몸.error ?? '').includes(expected.오류문구), true);
    });
  } finally {
    await 글지우기(request, 토큰, 설문.글);
  }
});
