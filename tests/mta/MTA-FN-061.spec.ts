import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입양식까지 } from './helpers/signup-flow.helper.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-061',
  name: '가입 양식 암호와 암호 확인을 7자로 적으면 「다음」이 꺼져 있다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    이름: z.string().describe('가입 양식에 적을 이름').default('가입 시험'),
    사용자명: z.string().describe('가입 양식에 적을 사용자명 — 영문 · 숫자 · 밑줄').default('tc_signup_form'),
    이메일: z.string().describe('가입 양식에 적을 이메일 — 형식이 맞는 주소').default('tc_signup_form@maxihan.com'),
    암호7자: z.string().describe('7자 암호 — 7글자').default('Abcd-12'),
    암호8자: z.string().describe('8자 암호 — 8글자').default('Abcd-123'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 양식 = new 가입양식화면(driver);

  await test.step('앱을 켜서 가입 양식을 연다', async () => {
    await 가입양식까지(driver);
    await verify('가입 양식 「사용자명」 칸이 보인다', await 양식.그려질때까지(), true, { blocker: true });
  });

  await test.step('암호와 암호 확인을 7자로 적는다', async () => {
    await 양식.채우기({ 이름: params.이름, 사용자명: params.사용자명, 이메일: params.이메일, 암호: params.암호7자, 암호확인: params.암호7자 });
    await verify('가입 양식 암호와 암호 확인을 7자로 적으면 「다음」이 꺼져 있다', await 양식.다음이꺼진채인가(), true);
  });

  await test.step('암호와 암호 확인을 8자로 적는다', async () => {
    await 양식.적기('암호칸', params.암호8자);
    await 양식.적기('암호확인칸', params.암호8자);
    await verify('암호 8자에서는 「다음」이 켜진다', await 양식.다음이켜질때까지(), true);
  });
});
