import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 로그인키보드화면 } from './pages/login-keyboard.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-031',
  name: '키보드 Tab 으로 링크로 옮겨 Enter 를 치면 링크가 눌린다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 화면 = new 로그인키보드화면(page);
  const 머리 = new 머리글(page);

  await test.step('로그인 화면에서 Tab 으로 「회원가입」 링크로 옮겨 Enter 를 친다', async () => {
    await 로그인.열기();
    await 화면.제목().waitFor();
    await 머리.로그인링크().waitFor();
    await verify('비회원이다', await 머리.로그인링크().isVisible(), true, { blocker: true });
    await 화면.탭으로초점옮기기(화면.본문회원가입링크(), 40);
    const 초점도착 = await 화면.초점이있는가(화면.본문회원가입링크());
    await 화면.엔터치기();
    await 화면.가입화면제목().waitFor();
    await verify('키보드 Tab 으로 링크로 옮겨 Enter 를 치면 링크가 눌린다', [초점도착, new URL(page.url()).pathname], [true, '/signup']);
  });
});
