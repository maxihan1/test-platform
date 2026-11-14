import { defineCase, test, verify } from '@platform/kit';

import { 앱다시켜기 } from './helpers/app.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-010',
  name: '시작 화면에 「<서버>에 가입하기」 · 「다른 서버 선택하기」 · 「로그인」 · 「더 알아보기」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('앱을 새로 켠다', async () => {
    await 앱다시켜기(driver);
    const 가입 = await verify('「<서버>에 가입하기」 버튼이 보인다', await 시작.기본서버버튼이('<서버>에 가입하기'), true);
    const 선택 = await verify('「다른 서버 선택하기」 버튼이 보인다', await 시작.버튼글('다른서버선택'), '다른 서버 선택하기');
    const 로그인 = await verify('「로그인」 버튼이 보인다', await 시작.버튼글('로그인'), '로그인');
    const 알아보기 = await verify('「더 알아보기」 버튼이 보인다', await 시작.버튼글('더알아보기'), '더 알아보기');
    await verify('시작 화면에 「<서버>에 가입하기」 · 「다른 서버 선택하기」 · 「로그인」 · 「더 알아보기」 버튼이 보인다', 가입 && 선택 && 로그인 && 알아보기, true);
  }, { capture: true });
});
