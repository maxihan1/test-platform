import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-017',
  name: '로그인 화면 위에 「데모마켓」 제목이 보인다',
  platforms: ['android'],
  precondition: ['앱을 켜 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.앱켜기();
    await verify('로그인 화면이 떠 있다', await 로그인.로그인버튼보일때까지(), true, { blocker: true });
    await verify('로그인 화면 위에 「데모마켓」 제목이 보인다', await 로그인.제목글(), '데모마켓');
    await verify('로그인 화면에 「아이디」 입력칸이 보인다', await 로그인.아이디칸이름(), '아이디');
    await verify('로그인 화면에 「비밀번호」 입력칸이 보인다', await 로그인.비밀번호칸이름(), '비밀번호');
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼글(), '로그인');
  }, { capture: true });
});
