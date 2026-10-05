import { defineCase, test, verify } from '@platform/kit';
import { 교육콘텐츠화면 } from './pages/education-content.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-011',
  name: '교육 콘텐츠 화면에 「교육 콘텐츠 알아보기」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 교육콘텐츠 = new 교육콘텐츠화면(page);

  await test.step('교육 콘텐츠 알아보기 화면을 연다', async () => {
    await 교육콘텐츠.연다();
    await 교육콘텐츠.제목.waitFor();
    await verify('교육 콘텐츠 화면에 「교육 콘텐츠 알아보기」 제목이 보인다', await 교육콘텐츠.제목.isVisible(), true, { blocker: true });
    await verify('「7대 도메인 분야」에 「이커머스」 · 「스마트팩토리」 · 「헬스케어」 · 「에너지」 · 「모빌리티」 · 「로봇」 · 「핀테크」가 보인다', [
      await 교육콘텐츠.도메인('이커머스').isVisible(),
      await 교육콘텐츠.도메인('스마트팩토리').isVisible(),
      await 교육콘텐츠.도메인('헬스케어').isVisible(),
      await 교육콘텐츠.도메인('에너지').isVisible(),
      await 교육콘텐츠.도메인('모빌리티').isVisible(),
      await 교육콘텐츠.도메인('로봇').isVisible(),
      await 교육콘텐츠.도메인('핀테크').isVisible(),
    ].every((보임) => 보임), true);
  });
});
