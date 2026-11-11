import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 동영상파일 } from './helpers/post.helper.js';
import { 미디어지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-641',
  name: '처리에 실패한 미디어를 조회하면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 올린 미디어의 처리가 실패했다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
  held: '보류 — 처리에 실패한 미디어를 만들 길이 없다',
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 올리기 = await request.post('/api/v2/media', { headers: 머리(토큰), multipart: { file: 동영상파일() } });
  const 미디어 = ((await 올리기.json().catch(() => ({}))) as { id?: string }).id ?? '';
  try {
    await test.step('처리에 실패한 미디어를 확인한다', async () => {
      await verify('일반 회원이 올린 미디어의 처리가 실패했다', 미디어 !== '', true, { blocker: true });
    });
    await test.step('처리에 실패한 미디어를 조회한다', async () => {
      const 응답 = await request.get(`/api/v1/media/${미디어}`, { headers: 머리(토큰) });
      await verify('처리에 실패한 미디어를 조회하면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 미디어지우기(request, 토큰, 미디어);
  }
});
