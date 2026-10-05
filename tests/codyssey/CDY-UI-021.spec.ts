import { defineCase, test, verify } from '@platform/kit';
import { 사람들목록화면 } from './pages/promotion-list.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-021',
  name: '코디세이 사람들 화면에 「코디세이 사람들」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 사람들목록 = new 사람들목록화면(page);

  await test.step('코디세이 사람들 화면을 연다', async () => {
    await 사람들목록.연다();
    await 사람들목록.제목.waitFor();
    await 사람들목록.카드들.first().waitFor();
    await verify('코디세이 사람들 화면에 「코디세이 사람들」 제목이 보인다', await 사람들목록.제목.isVisible(), true, { blocker: true });
    await verify('첫 쪽에 카드가 9장 보인다', await 사람들목록.카드들.count(), 9);
  });
});
