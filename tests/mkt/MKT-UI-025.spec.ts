import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { reviewCount: number };

export const spec = defineCase({
  tcId: 'MKT-UI-025',
  name: '상품 상세 화면에 큰 이미지 · 썸네일 4장 · 수량 칸 · 「상품 설명」 「리뷰」 「상품 문의」 탭이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 대상 = 목록.find((상품) => !상품.soldOut) as 상품요약;
  const 리뷰수 = ((await (await page.request.get(`/api/products/${대상.id}`)).json()) as 상품상세).reviewCount;

  await test.step('상품 상세 화면을 연다', async () => {
    await 상세.열기(대상.id);
    await 상세.상품명().waitFor();
    await 머리.장바구니링크().waitFor();
    await verify(
      '왼쪽에 큰 이미지 한 장이 보인다',
      [await 상세.큰이미지().count(), await 상세.좌우로놓여있는가(상세.큰이미지버튼(), 상세.상품명())],
      [1, true],
    );
    await verify(
      '큰 이미지 아래에 썸네일 4장이 보인다',
      [await 상세.썸네일버튼들().count(), await 상세.위아래로놓여있는가(상세.큰이미지버튼(), 상세.썸네일버튼(1))],
      [4, true],
    );
    await verify('수량 칸의 처음 값은 1 이다', await 상세.수량칸().inputValue(), '1');
    await verify('수량이 최소 1 이면 「−」 버튼이 눌리지 않는다', await 상세.수량줄이기버튼().isDisabled(), true);
    await verify(
      '아래에 「상품 설명」 「리뷰 ({개수})」 「상품 문의」 탭이 보인다',
      await 상세.탭들().allInnerTexts(),
      ['상품 설명', `리뷰 (${리뷰수})`, '상품 문의'],
    );
  });
});
