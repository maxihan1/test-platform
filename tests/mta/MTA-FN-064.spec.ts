import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입양식까지 } from './helpers/signup-flow.helper.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-064',
  name: '가입 양식 이메일 칸에 「abc」를 적고 다른 칸으로 옮기면 「유효한 이메일 주소처럼 보이지 않습니다.」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    이름: z.string().describe('가입 양식에 적을 이름').default('가입 시험'),
    사용자명: z.string().describe('가입 양식에 적을 사용자명 — 영문 · 숫자 · 밑줄').default('tc_signup_form'),
    이메일: z.string().describe('가입 양식에 적을 이메일 — 형식이 틀린 글자').default('abc'),
    암호: z.string().describe('가입 양식에 적을 암호 — 8자 이상').default('Signup-Test-1'),
    암호확인: z.string().describe('가입 양식에 적을 암호 확인 — 암호와 같은 글자').default('Signup-Test-1'),
  }),
  expected: z.object({
    오류문구: z.string().describe('이메일 오류 문구').default('유효한 이메일 주소처럼 보이지 않습니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 양식 = new 가입양식화면(driver);

  await test.step('앱을 켜서 가입 양식을 연다', async () => {
    await 가입양식까지(driver);
    await verify('가입 양식 「사용자명」 칸이 보인다', await 양식.그려질때까지(), true, { blocker: true });
  });

  await test.step('이메일 칸에 「abc」를 적고 다른 칸으로 옮긴다', async () => {
    await 양식.적기('이메일칸', params.이메일);
    await 양식.적기('암호칸', params.암호);
    await verify('가입 양식 이메일 칸에 「abc」를 적고 다른 칸으로 옮기면 「유효한 이메일 주소처럼 보이지 않습니다.」가 보인다', await 양식.글보이나(expected.오류문구), true);
  });
});
