import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 이동한화면, 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-046',
  name: '홈 탭의 글 제목을 누르면 그 글의 게시글 상세로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['공지 팝업을 닫아 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 이동 = new 이동한화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('공지 팝업이 보이지 않는다', await 홈.공지팝업보이나(), false, { blocker: true });
  });

  await test.step('「인기글」 탭의 첫 글 제목을 누른다', async () => {
    const 첫글 = 홈.글제목링크들.first();
    const 제목 = (await 첫글.innerText()).trim();
    await 첫글.click();
    await verify('홈 탭의 글 제목을 누르면 그 글의 게시글 상세로 간다', await 나타났나(이동.게시글상세제목.filter({ hasText: 제목 })), true);
  });
});
