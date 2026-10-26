import { defineCase, test, verify } from '@platform/kit';

import { 두프레임기다리기 } from './helpers/common-tools.helper.js';
import { 넉넉한상품, 요청을세기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-220',
  name: '리뷰는 「리뷰」 탭을 처음 누를 때 불러온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  const 리뷰요청 = 요청을세기(page, /\/api\/products\/\d+\/reviews/);

  try {
    await test.step('상품 상세를 연 뒤 「리뷰」 탭을 누른다', async () => {
      await 상세.열기(상품.id);
      await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
      await 두프레임기다리기(page);
      const 열때요청 = 리뷰요청.개수();
      const 응답 = page.waitForResponse((r) => /\/api\/products\/\d+\/reviews/.test(r.url()));
      await 상세.리뷰탭.click();
      await 응답;
      const 열때는없음 = await verify('상품 상세를 열 때는 리뷰 요청이 나가지 않는다', 열때요청, 0);
      const 누르면나감 = await verify('「리뷰」 탭을 누르면 리뷰 요청이 나간다', 리뷰요청.개수(), 1);
      await verify('리뷰는 「리뷰」 탭을 처음 누를 때 불러온다', 열때는없음 && 누르면나감, true);
    });
  } finally {
    리뷰요청.끝내기();
  }
});
