import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입양식까지, 새이름 } from './helpers/signup-flow.helper.js';
import { 이메일확인화면 } from './pages/email-confirm.page.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-069',
  name: '새 사용자명(tc_signup 으로 시작)으로 가입 양식을 채우고 「다음」을 누르면 「수신함 확인하기」 화면이 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    이름: z.string().describe('가입 양식에 적을 이름').default('가입 시험'),
    암호: z.string().describe('가입 양식에 적을 암호 — 8자 이상').default('Signup-Test-1'),
    암호확인: z.string().describe('가입 양식에 적을 암호 확인 — 암호와 같은 글자').default('Signup-Test-1'),
    사용자명: z.string().describe('가입할 사용자명 — tc_signup 으로 시작 · 비우면 시각을 붙여 새로 짓는다').optional(),
    이메일: z.string().describe('가입할 이메일 — 비우면 사용자명으로 새로 짓는다').optional(),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 양식 = new 가입양식화면(driver);
  const 확인 = new 이메일확인화면(driver);

  await test.step('앱을 켜서 가입 양식을 연다', async () => {
    await 가입양식까지(driver);
    await verify('가입 양식 「사용자명」 칸이 보인다', await 양식.그려질때까지(), true, { blocker: true });
  });

  await test.step('새 사용자명으로 가입 양식을 채우고 「다음」을 누른다', async () => {
    const 이름 = params.사용자명 ?? 새이름();
    await 양식.채우기({ 이름: params.이름, 사용자명: 이름, 이메일: params.이메일 ?? `${이름}@maxihan.com`, 암호: params.암호, 암호확인: params.암호확인 });
    await verify('「다음」이 켜진다', await 양식.다음이켜질때까지(), true, { blocker: true });
    await 양식.다음누르기();
    await verify('새 사용자명(tc_signup 으로 시작)으로 가입 양식을 채우고 「다음」을 누르면 「수신함 확인하기」 화면이 보인다', await 확인.그려질때까지(), true);
  });
});
