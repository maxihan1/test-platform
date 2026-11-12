import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 목록만들기, 목록지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-533',
  name: '만든 리스트를 지우면 본문 없는 성공으로 {} 가 온다',
  apiDoc: 1,
  precondition: ['일반 회원이 만든 리스트가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    본문: z.string().describe('응답 본문').default('{}'),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 목록 = await 목록만들기(request, 토큰);
  try {
    await test.step('만든 리스트를 확인한다', async () => {
      await verify('일반 회원이 만든 리스트가 있다', 목록 !== '', true, { blocker: true });
    });
    await test.step('DELETE /api/v1/lists/{id} 로 만든 리스트를 지운다', async () => {
      const 응답 = await request.delete(`/api/v1/lists/${목록}`, { headers: 머리(토큰) });
      await verify('만든 리스트를 지우면 본문 없는 성공으로 {} 가 온다', (await 응답.text()).trim(), expected.본문);
    });
  } finally {
    await 목록지우기(request, 토큰, 목록);
  }
});
