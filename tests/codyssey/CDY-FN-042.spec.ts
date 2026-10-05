import { defineCase, test, verify } from '@platform/kit';
import { 사람들목록화면 } from './pages/promotion-list.page.js';
import { 사람들상세화면 } from './pages/promotion-detail.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-042',
  name: '코디세이 사람들 카드를 누르면 상세에 「목록」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 사람들목록 = new 사람들목록화면(page);
  const 사람들상세 = new 사람들상세화면(page);

  await test.step('코디세이 사람들 화면을 연다', async () => {
    await 사람들목록.연다();
  });

  await test.step('코디세이 사람들 화면이 열렸는지 확인한다', async () => {
    await 사람들목록.제목.waitFor();
    await 사람들목록.카드들.first().waitFor();
    await verify('코디세이 사람들 화면에 「코디세이 사람들」 제목이 보인다', await 사람들목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('코디세이 사람들 화면에서 첫 카드를 누른다', async () => {
    await 사람들목록.첫카드를누른다();
    await 사람들상세.제목.waitFor();
    await verify('코디세이 사람들 카드를 누르면 상세에 「목록」 버튼이 보인다', await 사람들상세.목록버튼.isVisible(), true);
  });
});
