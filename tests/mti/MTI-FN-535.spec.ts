import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글쓰기, 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-535',
  name: '글 둘을 차례로 쓰면 나중 글의 id 가 더 크다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    나중글이큼: z.boolean().describe('나중 글의 id 가 더 큰지').default(true),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 첫글 = '';
  let 둘째글 = '';
  try {
    await test.step('일반 회원 토큰으로 글 둘을 차례로 쓴다', async () => {
      첫글 = await 글쓰기(request, 토큰);
      둘째글 = await 글쓰기(request, 토큰);
      await verify('글 둘을 차례로 쓰면 나중 글의 id 가 더 크다', 첫글 !== '' && 둘째글 !== '' && BigInt(둘째글) > BigInt(첫글), expected.나중글이큼);
    });
  } finally {
    await 글지우기(request, 토큰, 둘째글);
    await 글지우기(request, 토큰, 첫글);
  }
});
