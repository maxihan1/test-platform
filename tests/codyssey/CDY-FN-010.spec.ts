import { defineCase, test, verify } from '@platform/kit';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-010',
  name: '아이디와 비밀번호를 비운 채 「로그인」을 누르면 로그인 화면에 그대로 머문다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('로그인 화면의 「로그인」 버튼을 확인한다', async () => {
    await 화면.제목.waitFor();
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 화면.로그인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('아이디와 비밀번호를 비운 채 「로그인」을 누른다', async () => {
    await 화면.아이디와비밀번호를비운다();
    await 화면.로그인을누른다();
    await 화면.제목.waitFor();
    await verify('아이디와 비밀번호를 비운 채 「로그인」을 누르면 로그인 화면에 그대로 머문다', await 화면.현재경로(), '/loginForm');
  });
});
