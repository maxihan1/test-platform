import { defineCase, test, verify } from '@platform/kit';
import { 로그인상자 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-008',
  name: '가입하지 않은 이메일로 로그인하면 「입력하신 아이디 혹은 비밀번호가 일치하지 않습니다.」가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  techniques: ['동등 분할'],
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

  await test.step('로그인 화면에서 가입하지 않은 이메일과 아무 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 상자.적고누른다('cdy-none@example.com', 'Wrong-pass-1!');
    await 로그인.실패문구.waitFor();
    await verify(
      '가입하지 않은 이메일로 로그인하면 「입력하신 아이디 혹은 비밀번호가 일치하지 않습니다.」가 보인다',
      await 로그인.실패문구.isVisible(),
      true,
    );
  });
});
