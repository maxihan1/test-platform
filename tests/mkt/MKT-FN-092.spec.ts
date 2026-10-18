import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-092',
  name: '관심 분야 3개를 켜면 3개 모두 켜진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['경계값 분석'],
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

  await test.step('관심 분야 「패션」 · 「전자기기」 · 「도서」를 켠다', async () => {
    await 가입.관심분야칸('패션').check();
    await 가입.관심분야칸('전자기기').check();
    await 가입.관심분야칸('도서').check();
    await verify(
      '관심 분야 3개를 켜면 3개 모두 켜진다',
      {
        패션: await 가입.관심분야칸('패션').isChecked(),
        전자기기: await 가입.관심분야칸('전자기기').isChecked(),
        도서: await 가입.관심분야칸('도서').isChecked(),
      },
      { 패션: true, 전자기기: true, 도서: true },
    );
  });

  await test.step('관심 분야 4번째 「식품」을 켠다', async () => {
    await 가입.관심분야칸('식품').click();
    await verify(
      '관심 분야 4번째를 켜면 토스트 「관심 분야는 최대 3개까지 선택할 수 있습니다」가 나오고 「식품」은 꺼져 있다',
      {
        토스트: await 나타났나(가입.토스트.문구('관심 분야는 최대 3개까지 선택할 수 있습니다')),
        식품켜짐: await 가입.관심분야칸('식품').isChecked(),
      },
      { 토스트: true, 식품켜짐: false },
    );
  });
});
