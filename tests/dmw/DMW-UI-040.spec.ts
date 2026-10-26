import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-040',
  name: '홈 추천 상품 8개가 가로 한 줄로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
  });

  await test.step('홈 화면 추천 상품을 확인한다', async () => {
    const 개수 = await verify('추천 상품이 8개 보인다', await 홈.추천카드들.count(), 8);
    const 한줄 = await verify('추천 상품이 가로 한 줄로 늘어서 있다', await 홈.추천카드높이들(), 1);
    await verify('홈 추천 상품 8개가 가로 한 줄로 보인다', 개수 && 한줄, true);
  });

  await test.step('추천 상품 「다음」을 누른다', async () => {
    await 홈.추천다음.click();
    await 홈.추천줄멈출때까지();
    await verify('추천 상품 「다음」을 누르면 추천 상품 줄이 옆으로 넘어간다', (await 홈.추천줄가로위치()) > 0, true);
  });
});
