import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-073',
  name: '관심 분야 체크박스 「패션」 · 「전자기기」 · 「도서」 · 「식품」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 방해창막기(page);
    await 가입.열기();
    await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
  });

  await test.step('회원가입 화면의 관심 분야 칸을 확인한다', async () => {
    await verify(
      '관심 분야 체크박스 「패션」 · 「전자기기」 · 「도서」 · 「식품」이 보인다',
      {
        패션: await 가입.관심분야칸('패션').isVisible(),
        전자기기: await 가입.관심분야칸('전자기기').isVisible(),
        도서: await 가입.관심분야칸('도서').isVisible(),
        식품: await 가입.관심분야칸('식품').isVisible(),
      },
      { 패션: true, 전자기기: true, 도서: true, 식품: true },
    );
  });
});
