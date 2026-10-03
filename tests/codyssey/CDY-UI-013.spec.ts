import { defineCase, test, verify } from '@platform/kit';
import { 교육콘텐츠화면 } from './pages/education-content.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-013',
  name: '교육 콘텐츠 알아보기 화면에 제목과 머리글이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 교육콘텐츠화면(page);

  await test.step('교육 콘텐츠 알아보기 화면을 연다', async () => {
    await 화면.연다();
    await 화면.마지막머리글.waitFor();
    await verify('교육 콘텐츠 알아보기 화면에 제목 「교육 콘텐츠 알아보기」가 보인다', await 화면.제목.isVisible(), true);
    await verify(
      '교육 콘텐츠 알아보기 화면에 머리글 「7대 도메인 분야」 「AI·SW 도구 학습」 「AI·SW 심화 학습」 「AI·SW 응용 학습」이 보인다',
      (await 화면.보이는머리글(['7대 도메인 분야', 'AI·SW 도구 학습', 'AI·SW 심화 학습', 'AI·SW 응용 학습'])).join(', '),
      '7대 도메인 분야, AI·SW 도구 학습, AI·SW 심화 학습, AI·SW 응용 학습',
    );
  });
});
