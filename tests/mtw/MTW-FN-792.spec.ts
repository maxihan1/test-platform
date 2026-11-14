import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기, 새계정값, 연지3초지날때까지 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-792',
  name: '이미 있는 사용자명을 대문자로 바꿔 넣고 「등록하기」를 누르면 사용자명 칸에 오류가 보인다',
  precondition: ['비회원이다'],
  params: z.object({
    대문자사용자명: z.string().min(1).describe('이미 있는 사용자명을 대문자로 바꾼 글자 — 시드 계정 qa_user1 기준').default('QA_USER1'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 가입화면(page);
  let 연시각 = 0;

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    연시각 = await 가입화면열기(page);
    await verify('가입 화면이 열려 있다', await 가입.등록하기.isVisible(), true, { blocker: true });
  });

  await test.step('가입 화면 사용자명에 「QA_USER1」을 넣고 「등록하기」를 누른다', async () => {
    const 값 = 새계정값();
    await 가입.채우기({ 사용자명: params.대문자사용자명, 이메일: 값.이메일, 암호: 값.암호 });
    await 가입.동의하기();
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르기();
    const 칸오류 = await 가입.칸오류글(가입.사용자명칸);
    await verify('이미 있는 사용자명을 대문자로 바꿔 넣고 「등록하기」를 누르면 사용자명 칸에 오류가 보인다', 칸오류 !== '', true);
  });
});
