import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입양식까지, 새이름 } from './helpers/signup-flow.helper.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-583',
  name: '가입을 막은 메일 도메인으로 「다음」을 누르면 「은 에서의 가입을 허용하지 않습니다. 다른 것을 시도하거나 다른 서버를 선택하세요.」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  held: '보류 — 서버에 가입을 막은 메일 도메인이 없다',
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    이름: z.string().describe('가입 양식에 적을 이름').default('가입 시험'),
    암호: z.string().describe('가입 양식에 적을 암호 — 8자 이상').default('Signup-Test-1'),
    암호확인: z.string().describe('가입 양식에 적을 암호 확인 — 암호와 같은 글자').default('Signup-Test-1'),
    사용자명: z.string().describe('가입할 사용자명 — tc_signup 으로 시작 · 비우면 시각을 붙여 새로 짓는다').optional(),
    막힌메일도메인: z.string().describe('가입을 막은 메일 도메인 — 서버가 가입을 거절하는 도메인'),
  }),
  expected: z.object({
    오류문구: z.string().describe('가입 거절 오류 문구 끝부분').default('에서의 가입을 허용하지 않습니다. 다른 것을 시도하거나 다른 서버를 선택하세요.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 양식 = new 가입양식화면(driver);

  await test.step('앱을 켜서 가입 양식을 연다', async () => {
    await 가입양식까지(driver);
    await verify('가입 양식 「사용자명」 칸이 보인다', await 양식.그려질때까지(), true, { blocker: true });
  });

  await test.step('가입을 막은 메일 도메인으로 「다음」을 누른다', async () => {
    await 양식.채우기({ 이름: params.이름, 사용자명: params.사용자명 ?? 새이름(), 이메일: `${새이름()}@${params.막힌메일도메인}`, 암호: params.암호, 암호확인: params.암호확인 });
    await verify('「다음」이 켜진다', await 양식.다음이켜질때까지(), true, { blocker: true });
    await 양식.다음누르기();
    await verify('가입을 막은 메일 도메인으로 「다음」을 누르면 「은 에서의 가입을 허용하지 않습니다. 다른 것을 시도하거나 다른 서버를 선택하세요.」가 보인다', await 양식.글보이나(expected.오류문구), true);
  });
});
