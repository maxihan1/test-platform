import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-030',
  name: '로그인 화면에 제목 「Boss Room 게임 운영」 · 안내 문구 · 「아이디」 · 「비밀번호」 · 「로그인」 버튼이 보인다',
  precondition: ['로그인하지 않았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열기();
    const 제목 = await verify('로그인 화면에 제목 「Boss Room 게임 운영」이 보인다', await 로그인.제목.isVisible(), true);
    const 안내 = await verify('로그인 화면에 안내 문구가 보인다', await 로그인.안내.isVisible(), true);
    const 아이디 = await verify('로그인 화면에 「아이디」 칸이 보인다', await 로그인.아이디.isVisible(), true);
    const 비밀번호 = await verify('로그인 화면에 「비밀번호」 칸이 보인다', await 로그인.비밀번호.isVisible(), true);
    const 버튼 = await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼.isVisible(), true);
    await verify('로그인 화면에 제목 「Boss Room 게임 운영」 · 안내 문구 · 「아이디」 · 「비밀번호」 · 「로그인」 버튼이 보인다', 제목 && 안내 && 아이디 && 비밀번호 && 버튼, true);
  });

  await test.step('「비밀번호」 칸을 본다', async () => {
    await verify('「비밀번호」 칸은 글자를 가리는 칸으로 보인다', await 로그인.비밀번호.getAttribute('type'), 'password');
  });
});
