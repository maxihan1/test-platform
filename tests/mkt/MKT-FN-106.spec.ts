import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-106',
  name: 'POST /api/cart 로 담은 상품이 GET /api/cart 에 나온다',
  platforms: ['desktop'],
  precondition: [
    '새로 가입한 회원이 로그인해 있다',
    '새로 가입한 회원이 상품 한 줄을 담아 로그인해 있다',
    '새로 가입한 회원이 재고보다 많은 수량을 담아 로그인해 있다',
    '새로 가입한 회원이 「결제완료」 주문을 한 건 만들었다',
    '이미 취소한 주문이 있다',
  ],
  params: z.object({
    productId: z.number().describe('담을 상품 번호').default(2),
    lowStockId: z.number().describe('재고가 1개인 상품 번호').default(12),
    newQty: z.number().describe('바꿀 수량').default(3),
    reason: z.string().min(1).describe('취소 사유').default('단순 변심'),
  }),
  expected: z.object({
    created: z.number().describe('주문 응답 코드').default(201),
    conflict: z.number().describe('충돌 응답 코드').default(409),
    conflictCode: z.string().describe('충돌 응답 code').default('CONFLICT'),
    cancelledStatus: z.string().describe('취소 뒤 주문 상태').default('주문취소'),
  }),
});

const 계정비밀번호 = 'Mkt!2026pw';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

interface 장바구니줄 {
  id: number;
  productId: number;
  qty: number;
}

const 배송 = { receiver: '홍길동', phone: '01012345678', zipcode: '06236', address: '서울 강남구 테헤란로 123', detail: '101호', request: '', deliveryDate: '' };
const 결제 = { method: '무통장입금', cardCompany: '', installment: '' };

function 평일(): string {
  const 지금 = new Date();
  const 오늘 = new Date(지금.getFullYear(), 지금.getMonth(), 지금.getDate()).getTime();
  for (let 뒤 = 3; 뒤 <= 14; 뒤 += 1) {
    const 날 = new Date(오늘 + 뒤 * 86_400_000 + 3_600_000);
    if (날.getDay() !== 0) return `${날.getFullYear()}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;
  }
  return '';
}

test(spec, async ({ request, params, expected }) => {
  let 로그인됨 = false;
  const 장바구니를읽는다 = async (): Promise<장바구니줄[]> => ((await (await request.get('/api/cart')).json()) as { items: 장바구니줄[] }).items;
  const 담는다 = async (상품번호: number, 수량: number): Promise<number> => {
    const 응답 = await (await request.post('/api/cart', { data: { productId: 상품번호, color: '', size: '', qty: 수량 } })).json();
    return (응답 as { id: number }).id;
  };
  const 주문한다 = (본문: Record<string, unknown>): ReturnType<APIRequestContext['post']> =>
    request.post('/api/orders', { data: { shipping: { ...배송, deliveryDate: 평일() }, payment: 결제, couponId: '', ...본문 } });
  let 주문번호 = '';

  try {
    await test.step('이번 실행에서 쓸 새 회원을 가입시키고 로그인한다', async () => {
      const 아이디 = 새아이디();
      const 가입 = await request.post('/api/auth/signup', {
        data: {
          loginId: 아이디,
          password: 계정비밀번호,
          passwordConfirm: 계정비밀번호,
          name: '쇼핑시험',
          email: `${아이디}@example.com`,
          phone: '',
          birth: '1990-01-01',
          gender: '선택 안 함',
          interests: [],
          terms: true,
          privacy: true,
          marketing: false,
        },
      });
      if (!가입.ok()) throw new Error(`가입 실패 ${가입.status()}`);
      const 로그인 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 계정비밀번호, remember: false } });
      if (!로그인.ok()) throw new Error(`로그인 실패 ${로그인.status()}`);
      로그인됨 = true;
    });

    await test.step('POST /api/cart 로 담고 GET /api/cart 로 읽는다', async () => {
      await 담는다(params.productId, 1);
      await verify('POST /api/cart 로 담은 상품이 GET /api/cart 에 나온다', (await 장바구니를읽는다()).some((줄) => 줄.productId === params.productId), true);
    });

    await test.step('PATCH /api/cart/{itemId} 로 수량을 바꾼다', async () => {
      const 줄 = (await 장바구니를읽는다()).find((칸) => 칸.productId === params.productId);
      if (줄 === undefined) throw new Error('담은 줄이 없다');
      await request.patch(`/api/cart/${줄.id}`, { data: { qty: params.newQty } });
      await verify('PATCH /api/cart/{itemId} 로 수량을 바꾸면 GET /api/cart 에 바뀐 수량이 나온다', (await 장바구니를읽는다()).find((칸) => 칸.id === 줄.id)?.qty, params.newQty);
    });

    await test.step('DELETE /api/cart/{itemId} 로 줄을 지운다', async () => {
      const 줄 = (await 장바구니를읽는다()).find((칸) => 칸.productId === params.productId);
      if (줄 === undefined) throw new Error('담은 줄이 없다');
      await request.delete(`/api/cart/${줄.id}`);
      await verify('DELETE /api/cart/{itemId} 로 지운 줄은 GET /api/cart 에서 빠진다', (await 장바구니를읽는다()).some((칸) => 칸.id === 줄.id), false);
    });

    await test.step('POST /api/orders 로 주문한다', async () => {
      const 줄번호 = await 담는다(params.productId, 1);
      const 성공 = await 주문한다({ cartItemIds: [줄번호] });
      주문번호 = ((await 성공.json()) as { id?: string }).id ?? '';
      await verify('POST /api/orders 로 주문하면 201 이 온다', 성공.status(), expected.created);
      const 부족 = await 주문한다({ direct: { productId: params.lowStockId, color: '', size: '', qty: 2 } });
      await verify(
        '재고가 부족한 주문은 409 CONFLICT 가 온다',
        { 상태: 부족.status(), code: ((await 부족.json()) as { code?: string }).code },
        { 상태: expected.conflict, code: expected.conflictCode },
      );
    });

    await test.step('POST /api/orders/{id}/cancel 에 reason 과 detail 을 보낸다', async () => {
      await request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: params.reason, detail: '' } });
      const 상세 = (await (await request.get(`/api/orders/${encodeURIComponent(주문번호)}`)).json()) as { status?: string };
      await verify('POST /api/orders/{id}/cancel 로 결제완료 주문을 취소하면 주문 상태가 「주문취소」가 된다', 상세.status, expected.cancelledStatus);
    });

    await test.step('취소한 주문에 POST /api/orders/{id}/cancel 을 다시 부른다', async () => {
      const 다시 = await request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: params.reason, detail: '' } });
      await verify(
        '결제완료가 아닌 주문을 취소하면 409 CONFLICT 가 온다',
        { 상태: 다시.status(), code: ((await 다시.json()) as { code?: string }).code },
        { 상태: expected.conflict, code: expected.conflictCode },
      );
    });
  } finally {
    if (로그인됨) await request.delete('/api/me');
  }
});
