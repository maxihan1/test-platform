import { defineCase, test, verify } from '@platform/kit';
import { 비밀번호재설정화면 } from './pages/password-reset.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-024',
  name: '이름 칸을 비우고 「인증 메일 발송」을 누르면 이름 칸이 꼭 채워야 하는 칸으로 막힌다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 재설정 = new 비밀번호재설정화면(page);

  await test.step('비밀번호 재설정 화면을 연다', async () => {
    await 재설정.연다();
  });

  await test.step('비밀번호 재설정 화면이 열렸는지 확인한다', async () => {
    await 재설정.제목.waitFor();
    await verify('비밀번호 재설정 화면에 「비밀번호 재설정」 제목이 보인다', await 재설정.제목.isVisible(), true, { blocker: true });
  });

  await test.step('비밀번호 재설정 화면에서 이름 칸을 비우고 이메일 칸에 「cdy-none@example.com」을 적고 「인증 메일 발송」을 누른다', async () => {
    await 재설정.이메일칸.fill('cdy-none@example.com');
    await 재설정.발송버튼.click();
    await verify(
      '이름 칸을 비우고 「인증 메일 발송」을 누르면 이름 칸이 꼭 채워야 하는 칸으로 막힌다',
      await 재설정.이름칸.evaluate((칸) => (칸 as HTMLInputElement).validity.valueMissing),
      true,
    );
  });
});
