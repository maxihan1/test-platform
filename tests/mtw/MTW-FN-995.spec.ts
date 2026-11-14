import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 암호만들기 } from './helpers/text-data.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-995',
  name: '가입 암호 칸에 73자를 넣으면 72자까지만 들어간다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    암호글자수: z.number().int().min(73).max(120).describe('암호 칸에 넣을 글자 수 — 73~120자').default(73),
  }),
  expected: z.object({
    남는글자수: z.number().int().describe('칸에 남는 글자 수').default(72),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    await 가입화면열기(page);
    await verify('가입 화면이 열려 있다', await 가입.등록하기.isVisible(), true, { blocker: true });
  });

  await test.step('가입 화면 「암호」 칸에 73자를 넣는다', async () => {
    await 가입.암호치기(암호만들기(params.암호글자수));
    await verify('가입 암호 칸에 73자를 넣으면 72자까지만 들어간다', await 가입.글자수(가입.암호칸), expected.남는글자수);
  });
});
