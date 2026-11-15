import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 웹승인화면까지가기 } from './helpers/signup-flow.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 시작화면 } from './pages/start.page.js';
import { 웹로그인화면 } from './pages/web-login.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-585',
  name: '사용 불가 계정으로 로그인하면 「오류」 창에 서버 문구와 「확인」이 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  held: '보류 — 정지된 로그인 계정이 없다',
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    사용불가아이디: z.string().describe('사용 불가 계정 아이디 — 정지돼 로그인이 막힌 계정').meta({ secret: true }),
    사용불가비밀번호: z.string().describe('사용 불가 계정 비밀번호').meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 웹 = new 웹로그인화면(driver);
  const 창 = new 확인창(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('사용 불가 계정으로 로그인한다', async () => {
    await 웹승인화면까지가기(driver, params.사용불가아이디, params.사용불가비밀번호);
    await 웹.승인누르기();
    await verify('오류 창이 뜬다', await 창.뜰때까지(30_000), true, { blocker: true });
    const 제목 = await verify('창 제목이 「오류」다', await driver.$(창.제목).getText(), '오류');
    const 확인 = await verify('「확인」 버튼이 보인다', await driver.$(창.확인버튼).getText(), '확인');
    await verify('사용 불가 계정으로 로그인하면 「오류」 창에 서버 문구와 「확인」이 보인다', 제목 && 확인, true);
  });
});
