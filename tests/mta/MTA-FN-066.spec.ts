import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입양식까지 } from './helpers/signup-flow.helper.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-066',
  name: '가입 양식 두 암호 칸을 서로 다르게 적고 다른 칸으로 옮기면 「비밀번호가 일치하지 않습니다.」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    이름: z.string().describe('가입 양식에 적을 이름').default('가입 시험'),
    사용자명: z.string().describe('가입 양식에 적을 사용자명 — 영문 · 숫자 · 밑줄').default('tc_signup_form'),
    이메일: z.string().describe('가입 양식에 적을 이메일 — 형식이 맞는 주소').default('tc_signup_form@maxihan.com'),
    암호: z.string().describe('가입 양식에 적을 암호 — 8자 이상').default('Signup-Test-1'),
    암호확인: z.string().describe('가입 양식에 적을 암호 확인 — 암호와 다른 글자').default('Signup-Other-9'),
  }),
  expected: z.object({
    오류문구: z.string().describe('암호 불일치 오류 문구').default('비밀번호가 일치하지 않습니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 양식 = new 가입양식화면(driver);

  await test.step('앱을 켜서 가입 양식을 연다', async () => {
    await 가입양식까지(driver);
    await verify('가입 양식 「사용자명」 칸이 보인다', await 양식.그려질때까지(), true, { blocker: true });
  });

  await test.step('두 암호 칸을 서로 다르게 적고 다른 칸으로 옮긴다', async () => {
    await 양식.적기('암호칸', params.암호);
    await 양식.적기('암호확인칸', params.암호확인);
    await 양식.적기('이름칸', params.이름);
    await verify('가입 양식 두 암호 칸을 서로 다르게 적고 다른 칸으로 옮기면 「비밀번호가 일치하지 않습니다.」가 보인다', await 양식.글보이나(expected.오류문구), true);
  });
});
