import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 한글글자 } from './helpers/social.helper.js';
import { 컬렉션지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-682',
  name: '컬렉션 검증이 실패하면 error 가 객체다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    이름길이: z.number().describe('컬렉션 이름 글자 수 — 41 이상').default(41),
  }),
  expected: z.object({
    오류종류: z.string().describe('error 값의 종류').default('object'),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  try {
    await test.step('이름 41자로 POST /api/v1/collections 를 부른다', async () => {
      const 응답 = await request.post('/api/v1/collections', {
        headers: 머리(토큰),
        data: { name: 한글글자(params.이름길이), description: 'MTI 시험 컬렉션', sensitive: false, discoverable: false },
      });
      const 몸 = (await 응답.json()) as { error?: unknown; collection?: { id?: string } };
      번호 = 몸.collection?.id ?? '';
      await verify('컬렉션 검증이 실패하면 error 가 객체다', 몸.error === null ? 'null' : typeof 몸.error, expected.오류종류);
    });
  } finally {
    await 컬렉션지우기(request, 토큰, 번호);
  }
});
