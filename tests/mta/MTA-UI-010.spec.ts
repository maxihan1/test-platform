import { defineCase, test, verify } from '@platform/kit';

import { 시작화면열기 } from './helpers/login.helper.js';
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

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('시작 화면 버튼 글자를 확인한다', async () => {
    const 가입 = await verify('기본 서버 버튼이 「에 가입하기」로 끝난다', (await 시작.글('기본서버가입')).endsWith('에 가입하기'), true);
    const 다른 = await verify('「다른 서버 선택하기」 버튼이 보인다', await 시작.글('다른서버선택'), '다른 서버 선택하기');
    const 로그인 = await verify('「로그인」 버튼이 보인다', await 시작.글('로그인'), '로그인');
    const 더 = await verify('「더 알아보기」 버튼이 보인다', await 시작.글('더알아보기'), '더 알아보기');
    await verify('시작 화면에 「<서버>에 가입하기」 · 「다른 서버 선택하기」 · 「로그인」 · 「더 알아보기」 버튼이 보인다', 가입 && 다른 && 로그인 && 더, true);
  });
});
