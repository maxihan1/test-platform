import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 스크롤멈출때까지기다리기 } from './helpers/common-tools.helper.js';
import { 나타났나, 세로위치읽기, 창높이만큼내리기 } from './helpers/visual.helper.js';
import { 이동한화면, 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-021',
  name: '「맨 위로」를 누르면 화면이 맨 위로 올라간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 이동 = new 이동한화면(page);

  await test.step('상품 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 이동.상품목록열기();
    await 홈.머리글.그려질때까지();
    await 홈.바닥글.그려질때까지();
    await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 이동.상품목록제목.isVisible(), true, { blocker: true });
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('상품 목록 화면을 내린 뒤 「맨 위로」를 누른다', async () => {
    await 창높이만큼내리기(page);
    await verify('화면을 한 화면 높이만큼 내리면 「맨 위로」 버튼이 보인다', await 나타났나(홈.바닥글.맨위로), true, { blocker: true });
    await 홈.바닥글.맨위로.click();
    await 스크롤멈출때까지기다리기(page);
    await verify('「맨 위로」를 누르면 화면이 맨 위로 올라간다', await 세로위치읽기(page), 0);
  });
});
