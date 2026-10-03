import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { id: number; colors: string[]; sizes: string[] };
type 오류본문 = { code: string };

const 배송희망일 = (): string => {
  const 날 = new Date(Date.now() + 3 * 86_400_000);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  return `${날.getFullYear()}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;
};

export const spec = defineCase({
  tcId: 'MKT-FN-087',
  name: '실패한 API 는 입력 오류 400 · 로그인 필요 401 · 권한 없음 403 · 없음 404 · 충돌 409 와 코드로 응답한다',
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('이미 있는 아이디').default('user1'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 가입 = (아이디: string, 비밀번호: string) => ({
    loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false,
  });
  const 시각 = Date.now().toString(36);
  const 아이디 = `mk${시각}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${시각}9`;
  const 주문자아이디 = `mj${시각}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 주문자비밀번호 = `Mk!${시각}8`;
  await page.request.post('/api/auth/signup', { data: 가입(아이디, 비밀번호) });
  const 로그인응답 = await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  let 주문번호 = '';

  try {
    await test.step('틀린 입력으로 API 를 부른다', async () => {
      await verify('회원으로 로그인해 있다', 로그인응답.status(), 200, { blocker: true });
      const 응답 = await request.get('/api/address?q=a');
      await verify('입력 오류는 400 과 코드 「VALIDATION」으로 응답한다', [응답.status(), ((await 응답.json()) as 오류본문).code], [400, 'VALIDATION']);
    });

    await test.step('로그인이 필요한 API 를 부른다', async () => {
      const 응답 = await request.get('/api/auth/me');
      await verify('로그인이 필요하면 401 과 코드 「UNAUTHORIZED」로 응답한다', [응답.status(), ((await 응답.json()) as 오류본문).code], [401, 'UNAUTHORIZED']);
    });

    await test.step('남의 주문을 조회한다', async () => {
      await request.post('/api/auth/signup', { data: 가입(주문자아이디, 주문자비밀번호) });
      await request.post('/api/auth/login', { data: { loginId: 주문자아이디, password: 주문자비밀번호 } });
      const 상품들 = ((await (await request.get('/api/products?size=40')).json()) as { items: 상품요약[] }).items;
      const 상품 = (await (await request.get(`/api/products/${상품들.find((것) => !것.soldOut)?.id ?? 0}`)).json()) as 상품상세;
      const 만든주문 = await request.post('/api/orders', {
        data: {
          shipping: { receiver: '임시회원', phone: '01012345678', zipcode: '06236', address: '서울 강남구 테헤란로 123', detail: '101동 101호', request: '', deliveryDate: 배송희망일() },
          payment: { method: '무통장입금', cardCompany: '', installment: '' },
          couponId: '',
          direct: { productId: 상품.id, color: 상품.colors[0] ?? '', size: 상품.sizes[0] ?? '', qty: 1 },
        },
      });
      주문번호 = 만든주문.status() === 201 ? ((await 만든주문.json()) as { id: string }).id : '';
      await request.post('/api/auth/logout');
      const 응답 = await page.request.get(`/api/orders/${encodeURIComponent(주문번호)}`);
      await verify('권한이 없으면 403 과 코드 「FORBIDDEN」으로 응답한다', [응답.status(), ((await 응답.json()) as 오류본문).code], [403, 'FORBIDDEN']);
    });

    await test.step('없는 글을 조회한다', async () => {
      const 응답 = await request.get('/api/posts/999999999');
      await verify('없으면 404 와 코드 「NOT_FOUND」로 응답한다', [응답.status(), ((await 응답.json()) as 오류본문).code], [404, 'NOT_FOUND']);
    });

    await test.step('이미 있는 아이디로 가입한다', async () => {
      const 응답 = await request.post('/api/auth/signup', { data: 가입(params.loginId, 비밀번호) });
      await verify('충돌하면 409 와 코드 「CONFLICT」로 응답한다', [응답.status(), ((await 응답.json()) as 오류본문).code], [409, 'CONFLICT']);
    });
  } finally {
    await page.request.delete('/api/me');
    await request.post('/api/auth/login', { data: { loginId: 주문자아이디, password: 주문자비밀번호 } });
    if (주문번호 !== '') await request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
    await request.delete('/api/me');
  }
});
