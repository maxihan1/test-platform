import { defineCase, test, verify } from '@platform/kit';

import { 앱다시켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-017',
  name: '로그인 화면에 「데모마켓」 제목 · 「아이디」 · 「비밀번호」 입력칸 · 「로그인」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['앱을 새로 켰다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('앱을 새로 켠다', async () => {
    await 앱다시켜기(driver);
    await 로그인.열릴때까지().catch(() => undefined);
    await verify('로그인 화면이 보인다', await 로그인.보이나(), true, { blocker: true });
  });

  await test.step('로그인 화면을 확인한다', async () => {
    const 제목 = await verify('「데모마켓」 제목이 보인다', await 로그인.제목글(), '데모마켓');
    const 아이디 = await verify('「아이디」 입력칸이 보인다', await 로그인.아이디칸이름(), '아이디');
    const 비밀번호 = await verify('「비밀번호」 입력칸이 보인다', await 로그인.비밀번호칸이름(), '비밀번호');
    const 버튼 = await verify('「로그인」 버튼이 보인다', await 로그인.보이나(), true);
    await verify(
      '로그인 화면에 「데모마켓」 제목 · 「아이디」 · 「비밀번호」 입력칸 · 「로그인」 버튼이 보인다',
      제목 && 아이디 && 비밀번호 && 버튼,
      true,
    );
  }, { capture: true });
});
