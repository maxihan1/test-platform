import { defineCase, test, verify } from '@platform/kit';

import { 가입해서이메일확인화면으로 } from './helpers/confirm.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switcher.page.js';
import { 이메일확인화면 } from './pages/email-confirm.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-089',
  name: '이메일 확인 화면에서 뒤로 가기를 누르면 계정 전환 시트가 뜬다',
  platforms: ['android'],
  precondition: ['이메일 확인 대기 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 확인 = new 이메일확인화면(driver);
  const 시트 = new 계정전환시트(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('이메일 확인 대기 계정으로 로그인해 확인 화면을 연다', async () => {
    await 가입해서이메일확인화면으로(driver);
    await verify('「수신함 확인하기」 화면이 보인다', await 확인.그려질때까지(), true, { blocker: true });
  });

  await test.step('이메일 확인 화면에서 뒤로 가기를 누른다', async () => {
    await driver.back();
    await verify('이메일 확인 화면에서 뒤로 가기를 누르면 계정 전환 시트가 뜬다', await 시트.떴나(), true);
  });
});
