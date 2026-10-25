import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-017',
  name: '로그인 화면에 「데모마켓」 제목 · 아이디 · 비밀번호 입력칸 · 「로그인」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['앱을 새로 깔아 처음 켠 상태다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열려있나();
    await verify('로그인 화면 위에 「데모마켓」 제목이 보인다', await 로그인.제목.getText(), '데모마켓');
    await verify('로그인 화면에 「아이디」 입력칸이 보인다', await 로그인.아이디칸.isDisplayed(), true);
    await verify('로그인 화면에 「비밀번호」 입력칸이 보인다', await 로그인.비밀번호칸.isDisplayed(), true);
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼.isDisplayed(), true);
  }, { capture: true });
});
