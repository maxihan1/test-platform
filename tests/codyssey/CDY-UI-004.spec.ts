import { defineCase, test, verify } from '@platform/kit';
import { 비밀번호재설정화면 } from './pages/password-reset.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-004',
  name: '비밀번호 재설정 화면에 「비밀번호 재설정」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 재설정 = new 비밀번호재설정화면(page);

  await test.step('비밀번호 재설정 화면을 연다', async () => {
    await 재설정.연다();
    await 재설정.제목.waitFor();
    await verify('비밀번호 재설정 화면에 「비밀번호 재설정」 제목이 보인다', await 재설정.제목.isVisible(), true, { blocker: true });

    await 재설정.이름칸.waitFor();
    await 재설정.이메일칸.waitFor();
    const 칸보임 = [await 재설정.이름칸.isVisible(), await 재설정.이메일칸.isVisible()];
    await verify('자리표시가 「이름 입력」 · 「이메일 입력」인 입력칸이 보인다', 칸보임.every(Boolean), true);

    await 재설정.발송버튼.waitFor();
    await verify('「인증 메일 발송」 버튼이 보인다', await 재설정.발송버튼.isVisible(), true);

    await 재설정.취소링크.waitFor();
    await verify('「취소하기」 링크가 보인다', await 재설정.취소링크.isVisible(), true);
  });
});
