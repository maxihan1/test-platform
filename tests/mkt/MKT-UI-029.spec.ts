import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품상세 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-029',
  name: '상품 상세 화면에 이미지 · 옵션 · 수량 · 탭이 보이고 품절 상품에는 「품절」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '옵션이 있는 상품이 있다', '품절 상품이 있다'],
  params: z.object({
    optionProductId: z.number().describe('옵션이 있는 상품 번호').default(1),
    soldOutProductId: z.number().describe('품절 상품 번호').default(7),
  }),
  expected: z.object({
    reviewCount: z.number().describe('리뷰 개수').default(2),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 상품상세(page);

  await test.step('옵션이 있는 상품 상세 화면을 연다', async () => {
    await 상세.열기(params.optionProductId);
    await 상세.장바구니담기.waitFor();
    await verify(
      '상품 상세 왼쪽에 큰 이미지 한 장과 그 아래 썸네일 4장이 보인다',
      { 큰이미지: await 상세.큰이미지.count(), 썸네일: await 상세.썸네일들.count(), ...(await 상세.갤러리배치()) },
      { 큰이미지: 1, 썸네일: 4, 큰이미지가왼쪽: true, 썸네일이아래: true },
    );
    await verify(
      '옵션이 있는 상품에는 「색상」 · 「사이즈」 드롭다운이 보인다',
      { 색상: await 상세.색상.isVisible(), 사이즈: await 상세.사이즈.isVisible() },
      { 색상: true, 사이즈: true },
    );
    await verify(
      '수량은 「−」 · 「+」 버튼과 숫자 칸으로 보인다',
      { 줄이기: await 상세.수량줄이기.innerText(), 숫자칸: await 상세.수량칸.isVisible(), 늘리기: await 상세.수량늘리기.innerText() },
      { 줄이기: '−', 숫자칸: true, 늘리기: '+' },
    );
    await verify(
      '수량이 최소 1일 때 「−」 버튼은 눌리지 않는다',
      { 수량: await 상세.수량칸.inputValue(), 줄이기막힘: await 상세.수량줄이기.isDisabled() },
      { 수량: '1', 줄이기막힘: true },
    );
    await verify(
      '아래에 「상품 설명」 · 「리뷰 ({개수})」 · 「상품 문의」 탭이 보인다',
      [await 상세.설명탭.innerText(), await 상세.리뷰탭.innerText(), await 상세.문의탭.innerText()],
      ['상품 설명', `리뷰 (${expected.reviewCount})`, '상품 문의'],
    );
    const 시청자 = await 상세.시청자수.innerText();
    const 이름위치 = await 상세.상품명.boundingBox();
    const 시청자위치 = await 상세.시청자수.boundingBox();
    await verify(
      '상품명 아래에 「{N}명이 보고 있어요」가 보인다',
      /^\d+명이 보고 있어요$/.test(시청자) && 이름위치 !== null && 시청자위치 !== null && 이름위치.y + 이름위치.height <= 시청자위치.y + 1,
      true,
    );
  });

  await test.step('품절 상품 상세 화면을 연다', async () => {
    await 상세.열기(params.soldOutProductId);
    await 상세.품절버튼.waitFor();
    await verify(
      '품절 상품은 「장바구니 담기」 · 「바로 구매」 대신 눌리지 않는 「품절」 버튼이 보인다',
      { 품절버튼막힘: await 상세.품절버튼.isDisabled(), 장바구니담기: await 상세.장바구니담기.count(), 바로구매: await 상세.바로구매.count() },
      { 품절버튼막힘: true, 장바구니담기: 0, 바로구매: 0 },
    );
  });
});
