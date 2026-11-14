import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자채우기 } from './helpers/text-data.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-994',
  name: '가입 사용자명 칸에 31자를 넣으면 30자까지만 들어간다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    넣을글자수: z.number().int().min(31).max(60).describe('사용자명 칸에 넣을 글자 수 — 31~60자').default(31),
  }),
  expected: z.object({
    남는글자수: z.number().int().describe('칸에 남는 글자 수').default(30),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    await 가입화면열기(page);
    await verify('가입 화면이 열려 있다', await 가입.등록하기.isVisible(), true, { blocker: true });
  });

  await test.step('가입 화면 「사용자명」 칸에 31자를 넣는다', async () => {
    await 가입.사용자명치기(글자채우기(params.넣을글자수));
    await verify('가입 사용자명 칸에 31자를 넣으면 30자까지만 들어간다', await 가입.글자수(가입.사용자명칸), expected.남는글자수);
  });
});
