import { defineCase, test, verify } from '@platform/kit';

import { 장바구니화면 } from './pages/cart.page.js';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { id: number; name: string; colors: string[]; sizes: string[]; soldOut: boolean };

export const spec = defineCase({
  tcId: 'MKT-UI-028',
  name: '장바구니에 담은 상품이 이미지 · 상품명 · 옵션 · 수량 · 금액 줄로 보이고 체크박스가 모두 체크돼 있다',
  precondition: ['장바구니에 상품이 둘 담겨 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 상세들: 상품상세[] = [];
  for (const 상품 of 목록.filter((항목) => !항목.soldOut)) {
    상세들.push((await (await page.request.get(`/api/products/${상품.id}`)).json()) as 상품상세);
  }
  const 옵션있는상품 = 상세들.find((상품) => 상품.colors.length > 0 && 상품.sizes.length > 0) as 상품상세;
  const 옵션없는상품 = 상세들.find((상품) => 상품.colors.length === 0 && 상품.sizes.length === 0) as 상품상세;
  const 색 = 옵션있는상품.colors[0] ?? '';
  const 크기 = 옵션있는상품.sizes[0] ?? '';

  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    const 첫담기 = await page.request.post('/api/cart', { data: { productId: 옵션있는상품.id, color: 색, size: 크기, qty: 1 } });
    const 둘째담기 = await page.request.post('/api/cart', { data: { productId: 옵션없는상품.id, color: '', size: '', qty: 1 } });

    await test.step('장바구니 화면을 연다', async () => {
      await verify('장바구니에 상품이 둘 담겨 있다', [첫담기.status(), 둘째담기.status()], [201, 201], { blocker: true });
      await 장바구니.열기();
      await 장바구니.불러오는중표시().waitFor({ state: 'detached' });
      await verify(
        '담은 상품이 이미지 · 상품명 · 옵션 · 수량 · 금액 줄로 보인다',
        [
          await 장바구니.줄이미지(옵션있는상품.name).isVisible(),
          await 장바구니.줄상품명링크(옵션있는상품.name).isVisible(),
          await 장바구니.줄옵션(옵션있는상품.name, `${색} / ${크기}`).isVisible(),
          await 장바구니.줄수량칸(옵션있는상품.name).isVisible(),
          await 장바구니.줄금액(옵션있는상품.name).isVisible(),
          await 장바구니.줄이미지(옵션없는상품.name).isVisible(),
          await 장바구니.줄상품명링크(옵션없는상품.name).isVisible(),
          await 장바구니.줄수량칸(옵션없는상품.name).isVisible(),
          await 장바구니.줄금액(옵션없는상품.name).isVisible(),
        ],
        [true, true, true, true, true, true, true, true, true],
      );
      const 체크들: boolean[] = [];
      for (const 체크 of await 장바구니.줄체크들().all()) 체크들.push(await 체크.isChecked());
      await verify('줄마다 체크박스가 처음에는 모두 체크돼 있다', 체크들, [true, true]);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
