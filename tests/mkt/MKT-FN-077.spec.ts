import { defineCase, test, verify } from '@platform/kit';

import { 장바구니화면 } from './pages/cart.page.js';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { id: number; name: string; salePrice: number; maxQty: number; colors: string[]; sizes: string[] };

export const spec = defineCase({
  tcId: 'MKT-FN-077',
  name: '줄 수량을 바꾸면 줄 금액과 합계가 바뀌고 체크한 상품 금액 합에 따라 배송비가 정해진다',
  precondition: [
    '장바구니에 상품이 담겨 있다',
    '체크한 상품 금액 합이 50,000원 이상이다',
    '체크한 상품 금액 합이 50,000원 미만이다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 원 = (금액: number): string => `${금액.toLocaleString('ko-KR')}원`;
  const 숫자 = (글: string): number => Number(글.replace(/\D/g, ''));
  let 후보: 상품상세 | undefined;
  for (const 상품 of 목록.filter((항목) => !항목.soldOut)) {
    const 자세히 = (await (await page.request.get(`/api/products/${상품.id}`)).json()) as 상품상세;
    const 필요 = Math.ceil(50000 / Math.max(자세히.salePrice, 1));
    if (자세히.colors.length === 0 && 자세히.sizes.length === 0 && 자세히.salePrice < 50000 && 자세히.maxQty >= 필요) {
      후보 = 자세히;
      break;
    }
  }
  const 대상 = 후보 as 상품상세;
  const 필요수량 = Math.ceil(50000 / 대상.salePrice);

  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await page.request.post('/api/cart', { data: { productId: 대상.id, color: '', size: '', qty: 1 } });

    await test.step('장바구니 화면의 결제 요약을 읽는다', async () => {
      await 장바구니.열기();
      await 장바구니.불러오는중표시().waitFor({ state: 'detached' });
      await verify('장바구니에 상품이 담겨 있다', await 장바구니.줄들().count(), 1, { blocker: true });
      await verify(
        '체크한 상품 금액 합이 50,000원 미만이다',
        숫자(await 장바구니.상품금액().innerText()) < 50000,
        true,
        { blocker: true },
      );
      await verify('체크한 상품 금액 합이 50,000원 미만이면 배송비가 3,000원이다', await 장바구니.배송비().innerText(), '3,000원');
      await verify(
        '50,000원 미만이면 「{부족한 금액}원 더 담으면 무료 배송」이 보인다',
        await 장바구니.무료배송안내().innerText(),
        `${원(50000 - 대상.salePrice)} 더 담으면 무료 배송`,
      );
    });

    await test.step('줄의 수량을 바꾼다', async () => {
      for (let 번 = 1; 번 < 필요수량; 번 += 1) await 장바구니.줄수량늘리기버튼(대상.name).click();
      await 장바구니.상품금액이(원(대상.salePrice * 필요수량)).waitFor();
      await verify('줄 수량을 바꾸면 줄 금액이 바로 바뀐다', await 장바구니.줄금액(대상.name).innerText(), 원(대상.salePrice * 필요수량));
      await verify(
        '줄 수량을 바꾸면 합계가 바로 바뀐다',
        [await 장바구니.상품금액().innerText(), await 장바구니.결제예정금액().innerText()],
        [원(대상.salePrice * 필요수량), 원(대상.salePrice * 필요수량)],
      );
      await verify(
        '체크한 상품 금액 합이 50,000원 이상이다',
        숫자(await 장바구니.상품금액().innerText()) >= 50000,
        true,
        { blocker: true },
      );
      await verify('체크한 상품 금액 합이 50,000원 이상이면 배송비가 0원이다', await 장바구니.배송비().innerText(), '0원');
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
