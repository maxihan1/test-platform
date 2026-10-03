import { defineCase, test, verify } from '@platform/kit';

import { 상품상세화면 } from './pages/shop-detail.page.js';

type 상품요약 = { id: number; soldOut: boolean; reviewCount: number };

export const spec = defineCase({
  tcId: 'MKT-FN-110',
  name: '리뷰를 불러오지 못하면 안내와 「다시 시도」 버튼이 보이고 버튼을 누르면 리뷰를 다시 불러온다',
  precondition: ['비회원이다', '리뷰 조회가 실패하는 가짜 응답이다', '리뷰 불러오기가 실패한 상태다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 대상 = 목록.find((상품) => !상품.soldOut && 상품.reviewCount > 0) as 상품요약;
  let 실패시킴 = true;
  let 요청수 = 0;
  await page.context().route('**/api/products/*/reviews*', async (route) => {
    요청수 += 1;
    if (실패시킴) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'UNAVAILABLE', message: '일시적으로 사용할 수 없습니다' }) });
      return;
    }
    let 실제응답 = await route.fetch();
    for (let 번 = 0; 번 < 10 && 실제응답.status() !== 200; 번 += 1) 실제응답 = await route.fetch();
    await route.fulfill({ response: 실제응답 });
  });

  try {
    await test.step('「리뷰」 탭을 처음 누른다', async () => {
      await 상세.열기(대상.id);
      await 상세.상품명().waitFor();
      await 상세.탭들().first().waitFor();
      const 누르기전요청수 = 요청수;
      await 상세.탭(/^리뷰/).click();
      await 상세.리뷰실패문구().waitFor();
      await verify('리뷰는 탭을 처음 누를 때 불러온다', [누르기전요청수, 요청수], [0, 1]);
      await verify('리뷰를 불러오지 못하면 「리뷰를 불러오지 못했습니다」가 보인다', await 상세.리뷰실패문구().isVisible(), true);
      await verify('「다시 시도」 버튼이 보인다', await 상세.다시시도버튼().isVisible(), true);
    });

    await test.step('「다시 시도」를 누른다', async () => {
      await verify('리뷰 불러오기가 실패한 상태다', await 상세.리뷰실패문구().isVisible(), true, { blocker: true });
      실패시킴 = false;
      await 상세.다시시도버튼().click();
      await 상세.리뷰글들().first().waitFor();
      await verify(
        '「다시 시도」를 누르면 리뷰를 다시 불러와 리뷰 목록이 보인다',
        [요청수, await 상세.리뷰글들().count()],
        [2, 대상.reviewCount],
      );
    });
  } finally {
    await page.context().unrouteAll({ behavior: 'wait' });
  }
});
