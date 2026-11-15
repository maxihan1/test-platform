import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입양식까지, 새이름 } from './helpers/signup-flow.helper.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-584',
  name: '가입 양식에서 사용자명 31자로 「다음」을 누르면 오류 문구가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    이름: z.string().describe('가입 양식에 적을 이름').default('가입 시험'),
    암호: z.string().describe('가입 양식에 적을 암호 — 8자 이상').default('Signup-Test-1'),
    암호확인: z.string().describe('가입 양식에 적을 암호 확인 — 암호와 같은 글자').default('Signup-Test-1'),
    글자수: z.number().int().describe('사용자명 글자 수').default(31),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 양식 = new 가입양식화면(driver);

  await test.step('앱을 켜서 가입 양식을 연다', async () => {
    await 가입양식까지(driver);
    await verify('가입 양식 「사용자명」 칸이 보인다', await 양식.그려질때까지(), true, { blocker: true });
  });

  await test.step('사용자명 31자로 「다음」을 누른다', async () => {
    await 양식.채우기({ 이름: params.이름, 사용자명: 새이름('tc_signup', params.글자수), 이메일: `${새이름()}@maxihan.com`, 암호: params.암호, 암호확인: params.암호확인 });
    await verify('「다음」이 켜진다', await 양식.다음이켜질때까지(), true, { blocker: true });
    await 양식.다음누르기();
    await verify('가입 양식에서 사용자명 31자로 「다음」을 누르면 오류 문구가 보인다', await 양식.포커스가갈때까지('사용자명칸'), true);
  });
});
