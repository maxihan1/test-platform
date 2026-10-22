import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-017',
  name: '로그인 화면에 「데모마켓」 제목과 「아이디」 · 「비밀번호」 입력칸과 「로그인」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['앱이 새로 켜졌다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.제목나올때까지();
    const 제목 = await verify('「데모마켓」 제목이 보인다', await 로그인.제목글(), '데모마켓');
    const 아이디 = await verify('「아이디」 입력칸이 보인다', await 로그인.아이디칸이름글(), '아이디');
    const 비밀번호 = await verify('「비밀번호」 입력칸이 보인다', await 로그인.비밀번호칸이름글(), '비밀번호');
    const 버튼 = await verify('「로그인」 버튼이 보인다', await 로그인.로그인버튼이름글(), '로그인');
    await verify(
      '로그인 화면에 「데모마켓」 제목과 「아이디」 · 「비밀번호」 입력칸과 「로그인」 버튼이 보인다',
      제목 && 아이디 && 비밀번호 && 버튼,
      true,
    );
  });
});
