import { defineCase, test, verify } from '@platform/kit';
import { 교육과정화면 } from './pages/apply-course.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-010',
  name: '교육과정 화면에 「교육과정」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 교육과정 = new 교육과정화면(page);

  await test.step('교육과정 화면을 연다', async () => {
    await 교육과정.연다();
    await 교육과정.제목.waitFor();
    await verify('교육과정 화면에 「교육과정」 제목이 보인다', await 교육과정.제목.isVisible(), true, { blocker: true });
    await verify('「AI 올인원 과정 (최대 18개월)」 · 「AI 네이티브 과정 (최대 5개월)」 제목이 보인다', (await 교육과정.과정제목('AI 올인원 과정 (최대 18개월)').isVisible()) && (await 교육과정.과정제목('AI 네이티브 과정 (최대 5개월)').isVisible()), true);
  });
});
