import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { id: number; colors: string[]; sizes: string[] };

export const spec = defineCase({
  tcId: 'MKT-FN-074',
  name: '「바로 구매」를 누르면 이 상품만 담긴 주문서로 간다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  let 대상: 상품상세 | undefined;
  for (const 상품 of 목록.filter((항목) => !항목.soldOut)) {
    const 자세히 = (await (await page.request.get(`/api/products/${상품.id}`)).json()) as 상품상세;
    if (자세히.colors.length === 0 && 자세히.sizes.length === 0) {
      대상 = 자세히;
      break;
    }
  }
  const 옵션없는상품 = 대상 as 상품상세;

  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('옵션이 없는 상품의 「바로 구매」를 누른다', async () => {
      await 상세.열기(옵션없는상품.id);
      await 상세.상품명().waitFor();
      await 머리.로그아웃버튼().waitFor();
      await verify('회원으로 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
      await 상세.바로구매버튼().click();
      await 상세.주문서제목().waitFor();
      const 주소 = new URL(page.url());
      const 바로구매줄 = JSON.parse(주소.searchParams.get('direct') ?? '{}') as { productId?: number };
      const 담긴줄수 = ((await (await page.request.get('/api/cart')).json()) as { items: unknown[] }).items.length;
      await verify(
        '「바로 구매」를 누르면 이 상품만 담긴 주문서로 간다',
        [주소.pathname.startsWith('/checkout'), 바로구매줄.productId, 담긴줄수],
        [true, 옵션없는상품.id, 0],
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
