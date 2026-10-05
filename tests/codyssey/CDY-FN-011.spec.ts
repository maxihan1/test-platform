import { defineCase, test, verify } from '@platform/kit';
import { 로그인상자 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-011',
  name: '이메일 칸에 200자를 적으면 200자가 다 들어간다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 상자 = new 로그인상자(page);
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 상자.연다();
  });

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await 로그인.제목.waitFor();
    await verify('로그인 화면에 「로그인」 제목이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면의 이메일 칸에 200자를 적는다', async () => {
    await 상자.이메일칸.fill('a'.repeat(200));
    await verify('이메일 칸에 200자를 적으면 200자가 다 들어간다', (await 상자.이메일칸.inputValue()).length, 200);
  });

  await test.step('로그인 화면의 이메일 칸에 201자를 적는다', async () => {
    await 상자.이메일칸.fill('a'.repeat(201));
    await verify('이메일 칸에 201자를 적으면 200자까지만 들어간다', (await 상자.이메일칸.inputValue()).length, 200);
  });
});
