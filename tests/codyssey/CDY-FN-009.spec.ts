import { defineCase, test, verify } from '@platform/kit';
import { 로그인상자 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-009',
  name: '칸을 비운 채 「로그인」을 누르면 이메일 칸이 꼭 채워야 하는 칸으로 막힌다',
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

  await test.step('로그인 화면에서 칸을 모두 비운 채 「로그인」을 누른다', async () => {
    await 상자.로그인버튼.click();
    await verify(
      '칸을 비운 채 「로그인」을 누르면 이메일 칸이 꼭 채워야 하는 칸으로 막힌다',
      await 상자.이메일칸.evaluate((칸) => (칸 as HTMLInputElement).validity.valueMissing),
      true,
    );
  });
});
