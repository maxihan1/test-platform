import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입양식까지 } from './helpers/signup-flow.helper.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-059',
  name: '가입 양식 이메일을 끝 글자 1자인 「qa@maxihan.c」로 적으면 「다음」이 꺼져 있다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    이름: z.string().describe('가입 양식에 적을 이름').default('가입 시험'),
    사용자명: z.string().describe('가입 양식에 적을 사용자명 — 영문 · 숫자 · 밑줄').default('tc_signup_form'),
    암호: z.string().describe('가입 양식에 적을 암호 — 8자 이상').default('Signup-Test-1'),
    암호확인: z.string().describe('가입 양식에 적을 암호 확인 — 암호와 같은 글자').default('Signup-Test-1'),
    끝글자1자이메일: z.string().describe('끝 글자가 1자인 이메일 — 점 뒤 1자').default('qa@maxihan.c'),
    끝글자2자이메일: z.string().describe('끝 글자가 2자인 이메일 — 점 뒤 2자').default('qa@maxihan.co'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 양식 = new 가입양식화면(driver);

  await test.step('앱을 켜서 가입 양식을 연다', async () => {
    await 가입양식까지(driver);
    await verify('가입 양식 「사용자명」 칸이 보인다', await 양식.그려질때까지(), true, { blocker: true });
  });

  await test.step('이메일 끝 글자를 1자로 적는다', async () => {
    await 양식.채우기({ 이름: params.이름, 사용자명: params.사용자명, 이메일: params.끝글자1자이메일, 암호: params.암호, 암호확인: params.암호확인 });
    await verify('가입 양식 이메일을 끝 글자 1자인 「qa@maxihan.c」로 적으면 「다음」이 꺼져 있다', await 양식.다음이꺼진채인가(), true);
  });

  await test.step('이메일 끝 글자를 2자로 적는다', async () => {
    await 양식.적기('이메일칸', params.끝글자2자이메일);
    await verify('끝 글자 2자인 「qa@maxihan.co」에서는 「다음」이 켜진다', await 양식.다음이켜질때까지(), true);
  });
});
