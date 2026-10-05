import { defineCase, test, verify } from '@platform/kit';
import { 로그인상자 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-012',
  name: '비밀번호 칸에 100자를 적으면 100자가 다 들어간다',
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

  await test.step('로그인 화면의 비밀번호 칸에 100자를 적는다', async () => {
    await 상자.비밀번호칸.fill('a'.repeat(100));
    await verify('비밀번호 칸에 100자를 적으면 100자가 다 들어간다', (await 상자.비밀번호칸.inputValue()).length, 100);
  });

  await test.step('로그인 화면의 비밀번호 칸에 101자를 적는다', async () => {
    await 상자.비밀번호칸.fill('a'.repeat(101));
    await verify('비밀번호 칸에 101자를 적으면 100자까지만 들어간다', (await 상자.비밀번호칸.inputValue()).length, 100);
  });
});
