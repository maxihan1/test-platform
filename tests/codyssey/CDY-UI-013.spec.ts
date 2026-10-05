import { defineCase, test, verify } from '@platform/kit';
import { 연간교육일정화면 } from './pages/apply-schedule.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-013',
  name: '교육일정 화면에 「연간 교육일정」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 교육일정 = new 연간교육일정화면(page);

  await test.step('연간 교육일정 화면을 연다', async () => {
    await 교육일정.연다();
    await 교육일정.제목.waitFor();
    await verify('교육일정 화면에 「연간 교육일정」 제목이 보인다', await 교육일정.제목.isVisible(), true, { blocker: true });
    await verify('일정 표에 「과정 구분」 · 「세부 업무」 열이 보인다', (await 교육일정.표열('과정 구분').isVisible()) && (await 교육일정.표열('세부 업무').isVisible()), true);
  });
});
