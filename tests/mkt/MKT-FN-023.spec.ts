import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나, 창높이만큼내리기 } from './helpers/visual.helper.js';
import { 이동한화면, 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-023',
  name: '한 화면 이상 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다',
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

  await test.step('상품 목록 화면을 한 화면 높이만큼 내린다', async () => {
    await 창높이만큼내리기(page);
    await 나타났나(홈.바닥글.맨위로);
    await verify('한 화면 이상 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다', await 홈.맨위로위치(), { 보임: true, 오른쪽: true, 아래: true });
  });
});
