import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';

type 상품요약 = { id: number; name: string; salePrice: number; stock: number };
type 장바구니줄 = { id: number; productId: number };

const 날짜글자 = (날: Date): string =>
  `${날.getFullYear()}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;

const 평일 = (일수: number): string => {
  const 날 = new Date();
  날.setDate(날.getDate() + 일수);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  return 날짜글자(날);
};

export const spec = defineCase({
  tcId: 'MKT-FN-084',
  name: '주문서 세 단계를 거쳐 결제하면 주문 완료 화면이 뜨고 장바구니가 비고 재고가 줄어든다',
  precondition: ['새로 가입한 회원이 상품을 장바구니에 담았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 주문서화면(page);
  const 완료 = new 주문완료화면(page);
  const 머리 = new 머리글(page);
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 상품들 = (await (await page.request.get('/api/products?size=100')).json()).items as 상품요약[];
  let 상품: 상품요약 | undefined;
  for (const 후보 of 상품들) {
    if (후보.stock < 12) continue;
    const 후보상세 = await (await page.request.get(`/api/products/${후보.id}`)).json();
    if (후보상세.colors.length === 0 && 후보상세.sizes.length === 0) {
      상품 = 후보;
      break;
    }
  }
  await page.request.post('/api/cart', { data: { productId: 상품?.id ?? 0, color: '', size: '', qty: 1 } });
  const 담긴줄 = ((await (await page.request.get('/api/cart')).json()).items as 장바구니줄[]).find((줄) => 줄.productId === 상품?.id);
  const 주문전재고 = ((await (await page.request.get(`/api/products/${상품?.id ?? 0}`)).json()) as 상품요약).stock;
  let 주문번호 = '';

  try {
    await test.step('주문서 세 단계를 거쳐 결제한다', async () => {
      await 화면.장바구니로열기([담긴줄?.id ?? 0]);
      await 화면.배송정보제목().waitFor();
      await 머리.장바구니배지().waitFor();
      await verify('새로 가입한 회원이 상품을 장바구니에 담았다', await 머리.장바구니배지().innerText(), '1', { blocker: true });
      await 화면.배송정보채우기('임시회원', '01012345678', '06236', '서울 강남구 테헤란로 123', '4층', 평일(3));
      await 화면.다음버튼().click();
      await 화면.결제수단제목().waitFor();
      await 화면.결제수단라디오('계좌이체').check();
      await 화면.다음버튼().click();
      await 화면.최종확인제목().waitFor();
      const 최종금액글자 = await 화면.최종확인금액칸('최종 결제 금액').innerText();
      await 화면.동의체크().check();
      await 화면.결제버튼().click();
      await 완료.제목().waitFor();
      await 완료.결제금액().filter({ hasText: '원' }).waitFor();
      주문번호 = await 완료.주문번호().innerText();
      await verify('결제하면 주문 완료 화면에 「DM」 + 날짜 8자리 + 「-」 + 4자리 숫자 꼴의 주문번호가 보인다', /^DM\d{8}-\d{4}$/.test(주문번호), true);
      await verify('주문 완료 화면에 결제 금액이 보인다', await 완료.결제금액().innerText(), 최종금액글자);
      await verify(
        '주문 완료 화면에 「주문 내역 보기」와 「쇼핑 계속하기」 버튼이 보인다',
        [await 완료.주문내역보기링크().isVisible(), await 완료.쇼핑계속하기링크().isVisible()],
        [true, true],
      );
      const 남은줄 = ((await (await page.request.get('/api/cart')).json()).items as 장바구니줄[]).filter((줄) => 줄.productId === 상품?.id);
      await verify('주문한 상품은 장바구니에서 빠진다', 남은줄.length, 0);
      const 주문후재고 = ((await (await page.request.get(`/api/products/${상품?.id ?? 0}`)).json()) as 상품요약).stock;
      await verify('상품 재고가 주문 수량만큼 줄어든다', 주문전재고 - 주문후재고, 1);
    });
  } finally {
    if (주문번호 !== '') await page.request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
    await page.request.delete('/api/me');
  }
});
