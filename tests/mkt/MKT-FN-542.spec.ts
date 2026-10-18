import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기 } from './helpers/data.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 주소검색창 } from './pages/address-popup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-542',
  name: '주소 검색어 1자로 검색하면 「검색어를 2자 이상 입력하세요」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 상품 하나로 주문서를 열어 두었다'],
  techniques: ['경계값 분석'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(2),
    oneChar: z.string().describe('주소 검색어 1자 — 도로명 한 글자').default('테'),
    twoChars: z.string().describe('주소 검색어 2자 — 도로명 두 글자').default('테헤'),
    noResultWord: z.string().describe('맞는 주소가 없는 검색어').default('zzzz'),
    oneResultWord: z.string().describe('맞는 주소가 하나뿐인 검색어 — 도로명').default('테헤란로'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보; 팝업?: 주소검색창 } = {};

  try {
    await test.step('새로 가입한 회원이 상품 하나를 담고 주문서를 연다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      const 줄 = await 장바구니담기(page.request, params.productId);
      await 주문서.열기([줄]);
    });

    await test.step('주문서 배송 정보 단계가 열려 있는지 확인한다', async () => {
      await verify('새로 가입한 회원이 상품 하나로 주문서를 열어 두었다', await 주문서.배송정보제목.isVisible(), true, { blocker: true });
    });

    await test.step('주소 검색 창을 연다', async () => {
      const [팝업쪽] = await Promise.all([page.waitForEvent('popup'), 주문서.주소검색.click()]);
      상태.팝업 = new 주소검색창(팝업쪽);
      await 상태.팝업.뜰때까지();
    });

    await test.step('주소 검색 창이 열려 있는지 확인한다', async () => {
      await verify('주소 검색 창 제목 「주소 검색」이 보인다', await 상태.팝업?.제목.isVisible(), true, { blocker: true });
    });

    await test.step('주소 검색 창에서 1자로 검색한다', async () => {
      const 팝업 = 상태.팝업;
      if (!팝업) throw new Error('주소 검색 창이 열려 있지 않다');
      await 팝업.검색하기(params.oneChar);
      await 팝업.안내.filter({ hasText: /\S/ }).waitFor();
      await verify('주소 검색어 1자로 검색하면 「검색어를 2자 이상 입력하세요」가 보인다', await 팝업.안내.innerText(), '검색어를 2자 이상 입력하세요');
    });

    await test.step('주소 검색 창에서 2자로 검색한다', async () => {
      const 팝업 = 상태.팝업;
      if (!팝업) throw new Error('주소 검색 창이 열려 있지 않다');
      await 팝업.검색하기(params.twoChars);
      await 팝업.결과나올때까지();
      await verify('주소 검색어 2자로 검색하면 검색어 안내 없이 검색이 된다', [(await 팝업.안내.innerText()) === '', (await 팝업.결과들.count()) > 0], [true, true]);
    });

    await test.step('주소 검색 창에서 「zzzz」로 검색한다', async () => {
      const 팝업 = 상태.팝업;
      if (!팝업) throw new Error('주소 검색 창이 열려 있지 않다');
      await 팝업.검색하기(params.noResultWord);
      await 팝업.결과없음.waitFor();
      await verify('맞는 주소가 0건이면 주소 검색 창에 「검색 결과가 없습니다」가 보인다', await 팝업.결과없음.innerText(), '검색 결과가 없습니다');
    });

    await test.step('주소 검색 창에서 결과가 1건인 「테헤란로」로 검색한다', async () => {
      const 팝업 = 상태.팝업;
      if (!팝업) throw new Error('주소 검색 창이 열려 있지 않다');
      await 팝업.검색하기(params.oneResultWord);
      await 팝업.결과버튼들.first().waitFor();
      await verify('맞는 주소가 1건이면 주소 검색 결과가 한 줄 보인다', await 팝업.결과들.count(), 1);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
