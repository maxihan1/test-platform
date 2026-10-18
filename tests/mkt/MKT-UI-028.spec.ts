import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 아래에서시작하나, 토스트움직임읽기 } from './helpers/visual.helper.js';
import { 이동한화면, 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-028',
  name: '토스트가 아래에서 밀려 올라온다',
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
    await 이동.게시판목록열기();
    await 홈.머리글.그려질때까지();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 검색어 「나」로 검색해 토스트를 띄운다', async () => {
    await 이동.게시판목록검색어칸.fill('나');
    await 이동.게시판목록검색버튼.click();
    await 홈.토스트.아무거나뜰때까지();
    const 움직임 = await 토스트움직임읽기(page);
    await verify('토스트가 아래에서 밀려 올라온다', 움직임.이름 !== '' && 움직임.시간 === '0.3s' && 아래에서시작하나(움직임.첫변형), true);
  });
});
