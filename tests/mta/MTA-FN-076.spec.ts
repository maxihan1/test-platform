import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입양식까지, 새이름 } from './helpers/signup-flow.helper.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-076',
  name: '가입 양식에서 메일 서버가 없는 도메인 메일로 「다음」을 누르면 이메일 칸에 「유효한 이메일 주소처럼 보이지 않습니다.」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    이름: z.string().describe('가입 양식에 적을 이름').default('가입 시험'),
    이메일: z.string().describe('가입 양식에 적을 이메일 — 메일 서버가 없는 도메인').default('tc_signup_mx@zzqq-none.invalid'),
    암호: z.string().describe('가입 양식에 적을 암호 — 8자 이상').default('Signup-Test-1'),
    암호확인: z.string().describe('가입 양식에 적을 암호 확인 — 암호와 같은 글자').default('Signup-Test-1'),
    사용자명: z.string().describe('가입할 사용자명 — tc_signup 으로 시작 · 비우면 시각을 붙여 새로 짓는다').optional(),
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

  await test.step('메일 서버가 없는 도메인 메일로 「다음」을 누른다', async () => {
    await 양식.채우기({ 이름: params.이름, 사용자명: params.사용자명 ?? 새이름(), 이메일: params.이메일, 암호: params.암호, 암호확인: params.암호확인 });
    await verify('「다음」이 켜진다', await 양식.다음이켜질때까지(), true, { blocker: true });
    await 양식.다음누르기();
    await verify('가입 양식에서 메일 서버가 없는 도메인 메일로 「다음」을 누르면 이메일 칸에 「유효한 이메일 주소처럼 보이지 않습니다.」가 보인다', await 양식.글보이나(expected.오류문구), true);
  });
});
