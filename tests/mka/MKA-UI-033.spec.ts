import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록읽기, 상품읽기 } from './helpers/api.helper.js';
import { 원 } from './helpers/app.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-033',
  name: '할인 중인 상품 카드에 상품명 · 「{할인율}%」 · 판매가 · 「★ {평점} ({리뷰 수})」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    할인상품번호: z.number().describe('할인 중인 상품 번호').default(1),
    품절상품번호: z.number().describe('도서 분류의 품절 상품 번호').default(35),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('상품 목록을 연다', async () => {
    const 상품 = await 상품읽기(request, params.할인상품번호);
    await verify('고른 상품이 할인 중이다', 상품.discountRate > 0, true);
    const 찾음 = await 목록.카드찾기(상품.name);
    const 글들 = 찾음 ? await 목록.카드글들(상품.name) : [];
    const 이름 = await verify('카드에 상품명이 보인다', 글들.includes(상품.name), true);
    const 할인율 = await verify('카드에 「{할인율}%」가 보인다', 글들.includes(`${상품.discountRate}%`), true);
    const 판매가 = await verify('카드에 판매가가 보인다', 글들.includes(원(상품.salePrice)), true);
    const 평점 = await verify('카드에 「★ {평점} ({리뷰 수})」가 보인다', 글들.includes(`★ ${상품.rating.toFixed(1)} (${상품.reviewCount})`), true);
    await verify('할인 중인 상품 카드에 상품명 · 「{할인율}%」 · 판매가 · 「★ {평점} ({리뷰 수})」가 보인다', 이름 && 할인율 && 판매가 && 평점, true);
  });

  await test.step('상품 목록에서 「도서」 칩을 누른다', async () => {
    const 상품 = await 상품읽기(request, params.품절상품번호);
    await verify('고른 상품이 품절이다', 상품.soldOut, true);
    await 목록.칩누르기('도서');
    await 목록.총개수바뀔때까지(`총 ${(await 상품목록읽기(request, { category: '도서', size: 50 })).total}개`);
    const 찾음 = await 목록.카드찾기(상품.name);
    const 글들 = 찾음 ? await 목록.카드글들(상품.name) : [];
    await verify('품절 상품 카드에 「품절」이 보인다', 글들.includes('품절'), true);
  });
});
