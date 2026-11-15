import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입양식까지, 길이맞춘암호, 새이름 } from './helpers/signup-flow.helper.js';
import { 이메일확인화면 } from './pages/email-confirm.page.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-089',
  name: '가입 양식 암호를 72자로 적고 「다음」을 누르면 「수신함 확인하기」 화면이 보인다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    이름: z.string().describe('가입 양식에 적을 이름').default('가입 시험'),
    정상길이: z.number().int().describe('암호 글자 수 — 한도 안').default(72),
    넘는길이: z.number().int().describe('암호 글자 수 — 한도 바로 밖').default(73),
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

  await test.step('암호를 73자로 적고 「다음」을 누른다', async () => {
    const 긴암호 = 길이맞춘암호(params.넘는길이);
    await 양식.채우기({ 이름: params.이름, 사용자명: 새이름(), 이메일: `${새이름()}@maxihan.com`, 암호: 긴암호, 암호확인: 긴암호 });
    await verify('「다음」이 켜진다', await 양식.다음이켜질때까지(), true, { blocker: true });
    await 양식.다음누르기();
    const 안감 = await verify('「수신함 확인하기」 화면이 보이지 않는다', await 확인.그려질때까지(8_000), false);
    const 오류칸 = await verify('암호 칸에 포커스가 간다', await 양식.포커스가갈때까지('암호칸'), true);
    await verify('암호 73자에서는 「수신함 확인하기」 화면으로 가지 않고 암호 칸에 오류가 보인다', 안감 && 오류칸, true);
  });

  await test.step('암호를 72자로 적고 「다음」을 누른다', async () => {
    const 정상암호 = 길이맞춘암호(params.정상길이);
    await 양식.적기('암호칸', 정상암호);
    await 양식.적기('암호확인칸', 정상암호);
    await verify('「다음」이 켜진다', await 양식.다음이켜질때까지(), true, { blocker: true });
    await 양식.다음누르기();
    await verify('가입 양식 암호를 72자로 적고 「다음」을 누르면 「수신함 확인하기」 화면이 보인다', await 확인.그려질때까지(), true);
  });
});
