import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 그림파일, 미디어지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-633',
  name: '초점을 1.0,-1.0 으로 올리면 meta.focus 가 x 1 · y -1 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    가로: z.number().describe('meta.focus 의 x').default(1),
    세로: z.number().describe('meta.focus 의 y').default(-1),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  try {
    await test.step('focus=1.0,-1.0 으로 그림을 올린다', async () => {
      const 응답 = await request.post('/api/v2/media', { headers: 머리(토큰), multipart: { file: 그림파일(), focus: '1.0,-1.0' } });
      const 몸 = (await 응답.json()) as { id?: string; meta?: { focus?: { x?: number; y?: number } } };
      번호 = 몸.id ?? '';
      const 가로 = await verify('meta.focus 의 x 가 1 이다', 몸.meta?.focus?.x, expected.가로);
      const 세로 = await verify('meta.focus 의 y 가 -1 이다', 몸.meta?.focus?.y, expected.세로);
      await verify('초점을 1.0,-1.0 으로 올리면 meta.focus 가 x 1 · y -1 이다', 가로 && 세로, true);
    });
  } finally {
    await 미디어지우기(request, 토큰, 번호);
  }
});
