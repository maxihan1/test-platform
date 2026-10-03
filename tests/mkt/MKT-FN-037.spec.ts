import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

type 상품요약 = { id: number; stock: number };
type 장바구니줄 = { id: number; productId: number };

const 날짜글자 = (날: Date): string =>
  `${날.getFullYear()}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;

export const spec = defineCase({
  tcId: 'MKT-FN-037',
  name: '「주문 취소」에서 사유를 고르고 「취소 신청」을 누르면 주문 상태가 「주문취소」로 바뀌고 재고가 되돌아온다',
  precondition: ['새로 가입한 회원이 「결제완료」 주문을 하나 만들었다', '취소 사유 모달이 열려 있다', '취소한 주문의 상품이 있었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 주문상세화면(page);
  const 머리 = new 머리글(page);
  const 모달창 = new 모달(page);
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 상품들 = (await (await page.request.get('/api/products?size=100')).json()).items as 상품요약[];
  let 상품번호 = 0;
  for (const 후보 of 상품들) {
    if (후보.stock < 5) continue;
    const 후보상세 = await (await page.request.get(`/api/products/${후보.id}`)).json();
    if (후보상세.colors.length === 0 && 후보상세.sizes.length === 0) {
      상품번호 = 후보.id;
      break;
    }
  }
  await page.request.post('/api/cart', { data: { productId: 상품번호, color: '', size: '', qty: 1 } });
  const 담긴줄 = ((await (await page.request.get('/api/cart')).json()).items as 장바구니줄[]).find((줄) => 줄.productId === 상품번호);
  const 배송일 = new Date();
  배송일.setDate(배송일.getDate() + 3);
  if (배송일.getDay() === 0) 배송일.setDate(배송일.getDate() + 1);
  const 주문 = await (
    await page.request.post('/api/orders', {
      data: {
        shipping: { receiver: '임시회원', phone: '01012345678', zipcode: '06236', address: '서울 강남구 테헤란로 123', detail: '4층', request: '', deliveryDate: 날짜글자(배송일) },
        payment: { method: '계좌이체', cardCompany: '', installment: '' },
        couponId: '',
        cartItemIds: [담긴줄?.id ?? 0],
      },
    })
  ).json();
  const 주문번호 = String(주문.id ?? '');
  const 주문뒤재고 = ((await (await page.request.get(`/api/products/${상품번호}`)).json()) as 상품요약).stock;

  try {
    await test.step('주문 상세에서 「주문 취소」를 누른다', async () => {
      await 상세.열기(주문번호);
      await 머리.로그아웃버튼().waitFor();
      await 상세.상태글자().waitFor();
      await verify('새로 가입한 회원이 「결제완료」 주문을 하나 만들었다', await 상세.상태글자().innerText(), '결제완료', { blocker: true });
      await 상세.취소버튼().click();
      await 모달창.창().waitFor();
      await verify(
        '「주문 취소」를 누르면 모달에서 취소 사유 「단순 변심」 「상품 정보 상이」 「배송 지연」 「기타」를 고를 수 있다',
        await 상세.취소사유목록(),
        ['단순 변심', '상품 정보 상이', '배송 지연', '기타'],
      );
    });

    await test.step('취소 사유로 「기타」를 고른다', async () => {
      await verify('취소 사유 모달이 열려 있다', await 모달창.창().isVisible(), true, { blocker: true });
      await 상세.취소사유고르기('기타');
      await 상세.취소사유입력라벨().waitFor();
      await verify('「기타」를 고르면 필수 사유 입력칸이 나타난다', await 상세.취소사유입력칸().isVisible(), true);
    });

    await test.step('사유를 고르고 「취소 신청」을 누른다', async () => {
      await 상세.취소사유고르기('단순 변심');
      await 모달창.버튼('취소 신청').click();
      await 상세.취소버튼().waitFor({ state: 'hidden' });
      await verify('「취소 신청」을 누르면 주문 상태가 「주문취소」로 바뀐다', await 상세.상태글자().innerText(), '주문취소');
    });

    await test.step('취소한 뒤 상품 재고를 읽는다', async () => {
      await verify('취소한 주문의 상품이 있었다', await 상세.상품행들().count(), 1, { blocker: true });
      const 취소뒤재고 = ((await (await page.request.get(`/api/products/${상품번호}`)).json()) as 상품요약).stock;
      await verify('주문을 취소하면 재고가 주문 수량만큼 되돌아온다', 취소뒤재고 - 주문뒤재고, 1);
    });
  } finally {
    await page.request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
    await page.request.delete('/api/me');
  }
});
