import { defineCase, test, verify } from '@platform/kit';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-009',
  name: '아이디 칸에 201자를 적으면 200자만 남는다',
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

  await test.step('로그인 화면의 아이디 칸을 확인한다', async () => {
    await 화면.아이디칸.waitFor();
    await verify('로그인 화면의 아이디 칸에 안내 「이메일을 입력하세요.」가 보인다', await 화면.아이디칸.isVisible(), true, { blocker: true });
  });

  await test.step('아이디 칸에 영문 「a」를 201자 적는다', async () => {
    await 화면.아이디를적는다('a'.repeat(201));
    await verify('아이디 칸에 201자를 적으면 200자만 남는다', (await 화면.아이디칸.inputValue()).length, 200);
  });
});
