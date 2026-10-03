import { defineCase, test, verify } from '@platform/kit';
import { 연간교육일정화면 } from './pages/schedule.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-014',
  name: '연간 교육일정 화면에 제목과 과정 구분이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 연간교육일정화면(page);

  await test.step('연간 교육일정 화면을 연다', async () => {
    await 화면.연다();
    await 화면.일정표.waitFor();
    await verify('연간 교육일정 화면에 제목 「연간 교육일정」이 보인다', await 화면.제목.isVisible(), true);
    await verify(
      '연간 교육일정 화면에 구분 「AI 올인원 1기」 「AI 네이티브 1차」 「AI 올인원 2기」 「AI 네이티브 2차」가 보인다',
      (await 화면.보이는구분(['AI 올인원 1기', 'AI 네이티브 1차', 'AI 올인원 2기', 'AI 네이티브 2차'])).join(', '),
      'AI 올인원 1기, AI 네이티브 1차, AI 올인원 2기, AI 네이티브 2차',
    );
  });
});
