import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 옵션상품번호, 품절상품들 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-197',
  name: '상품 상세 왼쪽에 큰 이미지 한 장과 썸네일 4장이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 상세 화면을 연다', async () => {
    await 방해막기(page);
    await 상세.열기(옵션상품번호);
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify(
      '상품 상세 왼쪽에 큰 이미지 한 장과 썸네일 4장이 보인다',
      { 큰이미지: await 상세.큰이미지.count(), 썸네일: await 상세.썸네일들.count(), 왼쪽: await 상세.갤러리가왼쪽인가() },
      { 큰이미지: 1, 썸네일: 4, 왼쪽: true },
    );
    await verify(
      '상품 상세에 수량 「−」 · 「+」 버튼과 숫자 칸이 보인다',
      [await 상세.수량줄이기.isVisible(), await 상세.수량늘리기.isVisible(), await 상세.수량칸.isVisible()],
      [true, true, true],
    );
    await verify(
      '상품 상세 아래에 「상품 설명」 · 「리뷰 ({개수})」 · 「상품 문의」 탭이 보인다',
      { 탭: (await 상세.탭이름들()).map((글) => 글.replace(/\d+/, '{개수}')), 아래: await 상세.탭이아래인가() },
      { 탭: ['상품 설명', '리뷰 ({개수})', '상품 문의'], 아래: true },
    );
  });

  await test.step('품절 상품 상세 화면을 연다', async () => {
    const 품절 = (await 품절상품들(request))[0];
    await 상세.열기(품절.id);
    await verify(
      '품절 상품 상세에는 「장바구니 담기」 · 「바로 구매」 대신 눌리지 않는 「품절」 버튼이 보인다',
      {
        품절버튼: await 상세.품절버튼.isVisible(),
        눌림: await 상세.품절버튼.isEnabled(),
        담기: await 상세.장바구니담기.count(),
        바로구매: await 상세.바로구매.count(),
      },
      { 품절버튼: true, 눌림: false, 담기: 0, 바로구매: 0 },
    );
  });
});
