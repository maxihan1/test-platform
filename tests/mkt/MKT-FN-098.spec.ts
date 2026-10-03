import { defineCase, test, verify } from '@platform/kit';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { id: number; colors: string[]; sizes: string[] };
type 장바구니줄 = { id: number; productId: number; qty: number };

export const spec = defineCase({
  tcId: 'MKT-FN-098',
  name: '쿠폰 API 는 쿠폰 목록을 돌려주고 장바구니 API 는 담기 · 수량 변경 · 삭제 · 조회를 처리한다',
  precondition: ['회원으로 로그인해 있다', '새로 가입한 회원이 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  const 로그인응답 = await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  const 상품들 = ((await (await page.request.get('/api/products?size=40')).json()) as { items: 상품요약[] }).items;
  const 상품 = (await (await page.request.get(`/api/products/${상품들.find((것) => !것.soldOut)?.id ?? 0}`)).json()) as 상품상세;
  const 담을줄 = (수량: number) => ({ productId: 상품.id, color: 상품.colors[0] ?? '', size: 상품.sizes[0] ?? '', qty: 수량 });
  const 줄들 = async (): Promise<장바구니줄[]> => ((await (await page.request.get('/api/cart')).json()) as { items: 장바구니줄[] }).items;

  try {
    await test.step('보유 쿠폰 API 를 부른다', async () => {
      await verify('새로 가입한 회원이 로그인해 있다', 로그인응답.status(), 200, { blocker: true });
      const 응답 = await page.request.get('/api/coupons');
      await verify('보유 쿠폰 API 는 쿠폰 목록을 돌려준다', [응답.status(), Array.isArray(((await 응답.json()) as { items: unknown }).items)], [200, true]);
    });

    await test.step('장바구니 담기 · 수량 변경 · 삭제 API 를 차례로 부른다', async () => {
      const 담기 = await page.request.post('/api/cart', { data: 담을줄(1) });
      const 줄번호 = 담기.ok() ? ((await 담기.json()) as { id: number }).id : 0;
      const 변경 = await page.request.patch(`/api/cart/${줄번호}`, { data: { qty: 2 } });
      const 변경뒤수량 = (await 줄들()).find((줄) => 줄.id === 줄번호)?.qty;
      const 삭제 = await page.request.delete(`/api/cart/${줄번호}`);
      const 삭제뒤 = (await 줄들()).filter((줄) => 줄.id === 줄번호).length;
      await verify(
        '장바구니 API 로 담고 수량을 바꾸고 지울 수 있다',
        [담기.status(), 변경.ok(), 변경뒤수량, 삭제.status(), 삭제뒤],
        [201, true, 2, 204, 0],
      );
    });

    await test.step('장바구니 조회 API 를 부른다', async () => {
      const 담기 = await page.request.post('/api/cart', { data: 담을줄(2) });
      const 줄번호 = 담기.ok() ? ((await 담기.json()) as { id: number }).id : 0;
      const 담은줄 = (await 줄들()).find((줄) => 줄.id === 줄번호);
      await verify('장바구니 조회 API 는 담은 줄을 돌려준다', [담은줄?.productId, 담은줄?.qty], [상품.id, 2]);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
