import { defineCase, test, verify } from '@platform/kit';

import { 상품목록 } from './helpers/data.helper.js';
import { 처음에는오류로주다가되돌리기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-512',
  name: '리뷰를 불러오지 못하면 「리뷰를 불러오지 못했습니다」와 「다시 시도」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['비회원이다', '리뷰 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = (await 상품목록(request)).find((하나) => 하나.reviewCount > 0 && !하나.soldOut);
  if (상품 === undefined) throw new Error('리뷰가 있는 상품을 찾지 못했다');
  await 안내창막기(page);
  const 응답 = await 처음에는오류로주다가되돌리기(page, /\/api\/products\/\d+\/reviews$/, 500, { code: 'UNAVAILABLE', message: '잠시 후 다시 시도해 주세요' });

  try {
    await test.step('리뷰 응답을 서버 오류로 둔 채 「리뷰」 탭을 누른다', async () => {
      await 상세.열기(상품.id);
      await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
      await 상세.리뷰탭.click();
      await 상세.리뷰실패안내.waitFor();
      const 안내 = await verify('「리뷰를 불러오지 못했습니다」가 보인다', await 상세.리뷰실패안내.isVisible(), true);
      const 버튼 = await verify('「다시 시도」 버튼이 보인다', await 상세.다시시도.isVisible(), true);
      await verify('리뷰를 불러오지 못하면 「리뷰를 불러오지 못했습니다」와 「다시 시도」 버튼이 보인다', 안내 && 버튼, true);
    });

    await test.step('리뷰 응답을 정상으로 되돌리고 「다시 시도」를 누른다', async () => {
      응답.정상으로되돌리기();
      await 상세.리뷰다시불러오기(3);
      await verify('「다시 시도」를 누르면 리뷰를 다시 불러와 리뷰 목록이 보인다', (await 상세.리뷰글들.count()) > 0, true);
    });
  } finally {
    await 응답.끝내기();
  }
});
