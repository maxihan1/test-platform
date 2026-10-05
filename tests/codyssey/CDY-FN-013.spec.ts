import { defineCase, test, verify } from '@platform/kit';
import { 로그인상자 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-013',
  name: '「다른 지역이신가요?」를 누르면 「대전 대전 캠퍼스」 · 「경남 경남 캠퍼스」 링크가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
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

  await test.step('로그인 화면에서 「다른 지역이신가요?」를 누른다', async () => {
    await 로그인.다른지역버튼.click();
    const 링크이름 = ['대전 대전 캠퍼스', '경남 경남 캠퍼스'];
    for (const 이름 of 링크이름) await 로그인.지역링크(이름).waitFor();
    const 보임 = await Promise.all(링크이름.map((이름) => 로그인.지역링크(이름).isVisible()));
    await verify('「다른 지역이신가요?」를 누르면 「대전 대전 캠퍼스」 · 「경남 경남 캠퍼스」 링크가 보인다', 보임.every(Boolean), true);
  });
});
