import { defineCase, test, verify } from '@platform/kit';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { id: number; stock: number; colors: string[]; sizes: string[] };
type 주문요약 = { id: string };

const 배송희망일 = (): string => {
  const 날 = new Date(Date.now() + 3 * 86_400_000);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  return `${날.getFullYear()}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;
};

export const spec = defineCase({
  tcId: 'MKT-FN-099',
  name: '주문 API 는 재고가 모자라면 409 로 응답하고 주문 목록 · 상세 · 취소를 처리한다',
  precondition: [
    '새로 가입한 회원이 로그인해 있다',
    '새로 가입한 회원이 주문을 하나 만들었다',
    '다른 회원이 로그인해 있다',
    '「결제완료」 주문이 하나 있다',
    '이미 취소한 주문이 있다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 가입 = (아이디: string, 비밀번호: string) => ({
    loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false,
  });
  const 시각 = Date.now().toString(36);
  const 아이디 = `mk${시각}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${시각}9`;
  const 다른아이디 = `mj${시각}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 다른비밀번호 = `Mk!${시각}8`;
  await page.request.post('/api/auth/signup', { data: 가입(아이디, 비밀번호) });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  await request.post('/api/auth/signup', { data: 가입(다른아이디, 다른비밀번호) });
  await request.post('/api/auth/login', { data: { loginId: 다른아이디, password: 다른비밀번호 } });

  const 상품들 = ((await (await page.request.get('/api/products?size=40')).json()) as { items: 상품요약[] }).items;
  const 상품 = (await (await page.request.get(`/api/products/${상품들.find((것) => !것.soldOut)?.id ?? 0}`)).json()) as 상품상세;
  const 줄 = (수량: number) => ({ productId: 상품.id, color: 상품.colors[0] ?? '', size: 상품.sizes[0] ?? '', qty: 수량 });
  const 주문본문 = (수량: number) => ({
    shipping: { receiver: '임시회원', phone: '01012345678', zipcode: '06236', address: '서울 강남구 테헤란로 123', detail: '101동 101호', request: '', deliveryDate: 배송희망일() },
    payment: { method: '무통장입금', cardCompany: '', installment: '' },
    couponId: '',
    direct: 줄(수량),
  });
  const 만든주문 = await page.request.post('/api/orders', { data: 주문본문(1) });
  const 주문번호 = 만든주문.status() === 201 ? ((await 만든주문.json()) as 주문요약).id : '';
  let 취소됨 = false;

  try {
    await test.step('재고보다 많은 수량으로 주문 API 를 부른다', async () => {
      const 응답 = await page.request.post('/api/orders', { data: 주문본문(상품.stock + 1) });
      await verify('재고가 모자라면 주문 API 가 409 로 응답한다', 응답.status(), 409);
    });

    await test.step('내 주문 목록 API 와 주문 상세 API 를 부른다', async () => {
      await verify('새로 가입한 회원이 주문을 하나 만들었다', [만든주문.status(), 주문번호 !== ''], [201, true], { blocker: true });
      const 목록 = await page.request.get('/api/orders?period=all');
      const 상세 = await page.request.get(`/api/orders/${encodeURIComponent(주문번호)}`);
      const 목록주문들 = ((await 목록.json()) as { items: 주문요약[] }).items;
      await verify(
        '내 주문 목록과 상세 API 가 그 주문을 돌려준다',
        [목록.status(), 목록주문들.some((주문) => 주문.id === 주문번호), 상세.status(), ((await 상세.json()) as 주문요약).id],
        [200, true, 200, 주문번호],
      );
    });

    await test.step('남의 주문 상세 API 를 부른다', async () => {
      const 응답 = await request.get(`/api/orders/${encodeURIComponent(주문번호)}`);
      await verify('남의 주문 상세는 403 으로 응답한다', 응답.status(), 403);
    });

    await test.step('주문 취소 API 를 부른다', async () => {
      const 응답 = await page.request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
      취소됨 = 응답.ok();
      await verify('결제완료 주문은 취소 API 로 취소된다', 응답.ok(), true);
    });

    await test.step('주문 취소 API 를 다시 부른다', async () => {
      const 응답 = await page.request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
      await verify('결제완료가 아닌 주문을 취소하면 409 로 응답한다', 응답.status(), 409);
    });
  } finally {
    if (주문번호 !== '' && !취소됨) await page.request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
    await page.request.delete('/api/me');
    await request.delete('/api/me');
  }
});
