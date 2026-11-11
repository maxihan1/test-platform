import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 한글글자, 리스트비우기 } from './helpers/social.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-665',
  name: '리스트 제목 256자로 만들면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    안쪽글자수: z.number().describe('리스트 제목 글자 수 — 1~256').default(256),
    바깥쪽글자수: z.number().describe('리스트 제목 글자 수 — 257 이상').default(257),
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
    await test.step('제목 256자로 리스트를 만든다', async () => {
      const 응답 = await request.post('/api/v1/lists', { headers: 머리(토큰), data: { title: 한글글자(params.안쪽글자수) } });
      if (응답.status() === 200) 번호들.push(((await 응답.json()) as { id?: string }).id ?? '');
      await verify('리스트 제목 256자로 만들면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('제목 257자로 리스트를 만든다', async () => {
      const 응답 = await request.post('/api/v1/lists', { headers: 머리(토큰), data: { title: 한글글자(params.바깥쪽글자수) } });
      if (응답.status() === 200) 번호들.push(((await 응답.json()) as { id?: string }).id ?? '');
      await verify('리스트 제목 257자 만들기의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    await 리스트비우기(request, 토큰, 번호들);
  }
});
