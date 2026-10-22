import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-017',
  name: '로그인 화면에 「데모마켓」 제목, 「아이디」 · 「비밀번호」 입력칸, 「로그인」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['앱이 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 화면 = new 로그인화면(driver);

  await test.step(
    '로그인 화면을 연다',
    async () => {
      await 화면.제목이보일때까지();
      const 제목 = await verify('「데모마켓」 제목이 보인다', await 화면.제목.getText(), '데모마켓');
      const 아이디 = await verify('「아이디」 입력칸이 보인다', await 화면.아이디칸안내.getText(), '아이디');
      const 비밀번호 = await verify('「비밀번호」 입력칸이 보인다', await 화면.비밀번호칸안내.getText(), '비밀번호');
      const 버튼 = await verify('「로그인」 버튼이 보인다', await 화면.로그인버튼글자.getText(), '로그인');
      await verify(
        '로그인 화면에 「데모마켓」 제목, 「아이디」 · 「비밀번호」 입력칸, 「로그인」 버튼이 보인다',
        제목 && 아이디 && 비밀번호 && 버튼,
        true,
      );
    },
    { capture: true },
  );
});
