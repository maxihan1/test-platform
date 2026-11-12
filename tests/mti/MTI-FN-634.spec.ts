import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 그림파일, 미디어지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-634',
  name: '설명 10,000자로 그림을 올리면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('설명 10,000자 그림의 응답 코드').default(200),
    바깥쪽응답코드: z.number().describe('설명 10,001자 그림의 응답 코드').default(422),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('설명 10,000자로 그림을 올린다', async () => {
      const 응답 = await request.post('/api/v2/media', { headers: 머리(토큰), multipart: { file: 그림파일(), description: '가'.repeat(10000) } });
      만든.push(((await 응답.json()) as { id?: string }).id ?? '');
      await verify('설명 10,000자로 그림을 올리면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('설명 10,001자로 그림을 올린다', async () => {
      const 응답 = await request.post('/api/v2/media', { headers: 머리(토큰), multipart: { file: 그림파일(), description: '가'.repeat(10001) } });
      만든.push(((await 응답.json()) as { id?: string }).id ?? '');
      await verify('설명 10,001자 그림 올리기의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    for (const 번호 of 만든) await 미디어지우기(request, 토큰, 번호);
  }
});
