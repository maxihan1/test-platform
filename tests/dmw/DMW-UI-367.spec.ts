import { defineCase, test, verify } from '@platform/kit';

import { 상품목록 } from './helpers/data.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 응답늦추기 } from './helpers/shop-tools.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-367',
  name: '상품 상세에서 리뷰 탭을 처음 열면 「리뷰를 불러오는 중…」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '리뷰 응답이 늦게 온다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = (await 상품목록(request)).find((하나) => 하나.reviewCount > 0 && !하나.soldOut);
  if (상품 === undefined) throw new Error('리뷰가 있는 상품을 찾지 못했다');
  await 안내창막기(page);
  const 늦춤 = await 응답늦추기(page, /\/api\/products\/\d+\/reviews$/);

  try {
    await test.step('상품 상세를 연다', async () => {
      await 상세.열기(상품.id);
      await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
    });

    await test.step('리뷰 응답이 늦게 오는 채로 상품 상세에서 리뷰 탭을 누른다', async () => {
      await 상세.탭누르기(상세.리뷰탭);
      await 상세.리뷰불러오는중.waitFor();
      await verify('상품 상세에서 리뷰 탭을 처음 열면 「리뷰를 불러오는 중…」이 보인다', await 상세.리뷰불러오는중.isVisible(), true);
    });
  } finally {
    await 늦춤.끝내기();
  }
});
