import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 한글글자 } from './helpers/social.helper.js';
import { 필터지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-668',
  name: '필터 제목 256자로 만들면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    안쪽글자수: z.number().describe('필터 제목 글자 수 — 1~256').default(256),
    바깥쪽글자수: z.number().describe('필터 제목 글자 수 — 257 이상').default(257),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('안쪽 값일 때 응답 코드').default(200),
    바깥쪽응답코드: z.number().describe('바깥쪽 값일 때 응답 코드').default(422),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 번호들: string[] = [];
  try {
    await test.step('제목 256자로 필터를 만든다', async () => {
      const 응답 = await request.post('/api/v2/filters', { headers: 머리(토큰), data: { title: 한글글자(params.안쪽글자수), context: ['home'], filter_action: 'warn' } });
      if (응답.status() === 200) 번호들.push(((await 응답.json()) as { id?: string }).id ?? '');
      await verify('필터 제목 256자로 만들면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('제목 257자로 필터를 만든다', async () => {
      const 응답 = await request.post('/api/v2/filters', { headers: 머리(토큰), data: { title: 한글글자(params.바깥쪽글자수), context: ['home'], filter_action: 'warn' } });
      if (응답.status() === 200) 번호들.push(((await 응답.json()) as { id?: string }).id ?? '');
      await verify('필터 제목 257자 만들기의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    for (const 번호 of 번호들) await 필터지우기(request, 토큰, 번호);
  }
});
