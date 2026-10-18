import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 사라졌나 } from './helpers/visual.helper.js';
import { 이동한화면, 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-018',
  name: '처리 결과 토스트가 화면 아래 가운데에 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 이동 = new 이동한화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await page.clock.install();
    await 이동.게시판목록열기();
    await 홈.머리글.그려질때까지();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 검색어 「가」로 검색한다', async () => {
    await 이동.게시판목록검색어칸.fill('가');
    await 이동.게시판목록검색버튼.click();
    await 홈.토스트.아무거나뜰때까지();
    await verify('처리 결과 토스트가 화면 아래 가운데에 보인다', await 홈.토스트위치(), { 보임: true, 가운데: true, 아래: true });
  });

  await test.step('토스트가 뜬 뒤 3초를 보낸다', async () => {
    await page.clock.runFor(3000);
    await verify('3초가 지나면 토스트가 사라진다', await 사라졌나(홈.토스트.모두), true);
  });
});
