import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 한글글자, 컬렉션비우기 } from './helpers/social.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-677',
  name: '컬렉션 이름 40자로 만들면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    안쪽글자수: z.number().describe('컬렉션 이름 글자 수 — 1~40').default(40),
    바깥쪽글자수: z.number().describe('컬렉션 이름 글자 수 — 41 이상').default(41),
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
    await test.step('이름 40자로 컬렉션을 만든다', async () => {
      const 응답 = await request.post('/api/v1/collections', {
        headers: 머리(토큰),
        data: { name: 한글글자(params.안쪽글자수), description: 'MTI 시험 컬렉션', sensitive: false, discoverable: false },
      });
      if (응답.status() === 200) 번호들.push(((await 응답.json()) as { collection?: { id?: string } }).collection?.id ?? '');
      await verify('컬렉션 이름 40자로 만들면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('이름 41자로 컬렉션을 만든다', async () => {
      const 응답 = await request.post('/api/v1/collections', {
        headers: 머리(토큰),
        data: { name: 한글글자(params.바깥쪽글자수), description: 'MTI 시험 컬렉션', sensitive: false, discoverable: false },
      });
      if (응답.status() === 200) 번호들.push(((await 응답.json()) as { collection?: { id?: string } }).collection?.id ?? '');
      await verify('컬렉션 이름 41자 만들기의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    await 컬렉션비우기(request, 토큰, 번호들);
  }
});
