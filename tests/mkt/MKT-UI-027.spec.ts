import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-027',
  name: '상품 목록 화면에 상품 카드와 필터와 정렬이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '품절 상품이 있다'],
  params: z.object({
    discountName: z.string().min(1).describe('할인 상품 이름').default('데모 니트 가디건'),
    soldOutName: z.string().min(1).describe('품절 상품 이름').default('클린 코드 이야기'),
  }),
  expected: z.object({
    perRow: z.number().describe('한 줄 카드 수').default(4),
    sliderRange: z.string().describe('슬라이더 최소, 최대, 단위').default('0, 500000, 10000'),
  }),
});

function 빨간가(색: string): boolean {
  const [r = 0, g = 0, b = 0] = (색.match(/\d+/g) ?? []).map(Number);
  return r >= 180 && g <= 80 && b <= 80;
}

function 회색인가(색: string): boolean {
  const [r = 0, g = 0, b = 0] = (색.match(/\d+/g) ?? []).map(Number);
  return Math.max(r, g, b) - Math.min(r, g, b) <= 30;
}

test(spec, async ({ page, params, expected }) => {
  const 목록 = new 상품목록(page);

  await test.step('상품 목록 화면을 연다', async () => {
    await 목록.열고기다린다();
    await verify('상품은 카드 모양으로 한 줄에 4개씩 보인다', await 목록.한줄카드수(), expected.perRow);

    const 카드 = 목록.카드(params.discountName);
    const 보이는부분: string[] = [];
    if (await 목록.카드이미지(카드).isVisible()) 보이는부분.push('이미지');
    if (await 목록.카드상품명(카드).isVisible()) 보이는부분.push('상품명');
    if (await 목록.카드할인가격(카드).isVisible()) 보이는부분.push('가격');
    if (await 목록.카드할인율(카드).isVisible()) 보이는부분.push('할인율');
    if (await 목록.카드별점(카드).isVisible()) 보이는부분.push('별점');
    await verify('상품 카드에 이미지 · 상품명 · 가격 · 할인율 · 별점이 보인다', 보이는부분.join(', '), '이미지, 상품명, 가격, 할인율, 별점');

    const 줄긋기 = await 목록.줄긋기를읽는다(카드);
    const 할인색 = await 목록.글자색을읽는다(목록.카드할인가격(카드));
    await verify('할인 상품은 원래 가격에 가운데 줄이 그어지고 할인 가격이 빨갛게 보인다', 줄긋기 === 'line-through' && 빨간가(할인색), true);

    const 보이는분류: string[] = [];
    for (const 이름 of ['패션', '전자기기', '도서', '식품']) {
      if (await 목록.카테고리(이름).isVisible()) 보이는분류.push(이름);
    }
    await verify('왼쪽 필터에 카테고리 「패션」 · 「전자기기」 · 「도서」 · 「식품」이 보인다', 보이는분류.join(', ') + (await 목록.필터가목록왼쪽인가() ? '' : ' (왼쪽 아님)'), '패션, 전자기기, 도서, 식품');
    await verify('가격 범위 슬라이더는 0원부터 500,000원까지 10,000원 단위로 보인다', await 목록.슬라이더범위(), expected.sliderRange);
    await verify('「품절 상품 제외」 스위치는 기본으로 꺼져 있다', await 목록.품절제외.isChecked(), false);

    await 목록.끝까지내린다(40);
    const 덮개 = await 목록.덮개를읽는다(목록.카드(params.soldOutName));
    await verify('품절 상품 카드에는 회색 덮개와 「품절」 표시가 보인다', { 글자: 덮개.글자, 회색: 회색인가(덮개.배경) }, { 글자: '품절', 회색: true });

    const 선택지들 = (await 목록.정렬선택지들.allInnerTexts()).join(', ');
    await verify('정렬 드롭다운에 「추천순」 · 「낮은 가격순」 · 「높은 가격순」 · 「리뷰 많은순」이 있다', 선택지들, '추천순, 낮은 가격순, 높은 가격순, 리뷰 많은순');
    await verify('정렬 드롭다운의 기본값은 「추천순」이다', await 목록.정렬선택값(), '추천순');
  });
});
