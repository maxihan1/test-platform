import { defineCase, test, verify } from '@platform/kit';
import { 세계관화면 } from './pages/about-world.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-007',
  name: '세계관 화면에 「코디세이 세계관」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 세계관 = new 세계관화면(page);

  await test.step('코디세이 세계관 화면을 연다', async () => {
    await 세계관.연다();
    await 세계관.제목.waitFor();
    await verify('세계관 화면에 「코디세이 세계관」 제목이 보인다', await 세계관.제목.isVisible(), true, { blocker: true });
    await verify('「Challenging」 · 「Growing」 · 「Discovering」 가치가 보인다', (await 세계관.가치('Challenging').isVisible()) && (await 세계관.가치('Growing').isVisible()) && (await 세계관.가치('Discovering').isVisible()), true);
  });
});
