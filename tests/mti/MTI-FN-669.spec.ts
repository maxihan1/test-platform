import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 한글글자 } from './helpers/social.helper.js';
import { 필터만들기, 필터지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-669',
  name: '필터 키워드 512자로 더하면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 만든 필터가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    안쪽글자수: z.number().describe('필터 키워드 글자 수 — 1~512').default(512),
    바깥쪽글자수: z.number().describe('필터 키워드 글자 수 — 513 이상').default(513),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('안쪽 값일 때 응답 코드').default(200),
    바깥쪽응답코드: z.number().describe('바깥쪽 값일 때 응답 코드').default(422),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 필터 = '';
  try {
    필터 = (await 필터만들기(request, 토큰)).id;
    await test.step('준비한 필터를 확인한다', async () => {
      await verify('일반 회원이 만든 필터가 있다', 필터 !== '', true, { blocker: true });
    });
    await test.step('키워드 512자로 필터 키워드를 더한다', async () => {
      const 응답 = await request.post(`/api/v2/filters/${필터}/keywords`, { headers: 머리(토큰), data: { keyword: 한글글자(params.안쪽글자수), whole_word: false } });
      await verify('필터 키워드 512자로 더하면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('키워드 513자로 필터 키워드를 더한다', async () => {
      const 응답 = await request.post(`/api/v2/filters/${필터}/keywords`, { headers: 머리(토큰), data: { keyword: 한글글자(params.바깥쪽글자수), whole_word: false } });
      await verify('필터 키워드 513자 더하기의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    await 필터지우기(request, 토큰, 필터);
  }
});
