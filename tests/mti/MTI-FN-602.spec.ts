import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 선호공개범위 } from './helpers/post.helper.js';
import { 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-602',
  name: 'visibility 없이 글을 쓰면 visibility 가 GET /api/v1/preferences 의 posting:default:visibility 와 같다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 기본값 = await 선호공개범위(request, 토큰);
  let 번호 = '';
  try {
    await test.step('visibility 없이 글을 쓴다', async () => {
      const 응답 = await request.post('/api/v1/statuses', { headers: 머리(토큰), data: { status: 'MTI 공개 범위 시험 글' } });
      const 몸 = (await 응답.json()) as { id?: string; visibility?: string };
      번호 = 몸.id ?? '';
      await verify('visibility 없이 글을 쓰면 visibility 가 GET /api/v1/preferences 의 posting:default:visibility 와 같다', 몸.visibility, 기본값);
      await verify('응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 글지우기(request, 토큰, 번호);
  }
});
