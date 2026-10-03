import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { id: number; colors: string[]; sizes: string[] };
type 장바구니줄 = { productId: number; qty: number };

export const spec = defineCase({
  tcId: 'MKT-FN-073',
  name: '「장바구니 담기」를 누르면 토스트와 배지 숫자가 바뀌고 같은 상품을 다시 담으면 수량이 더해진다',
  precondition: ['회원으로 로그인해 있다 · 장바구니가 비어 있다', '같은 상품이 장바구니에 담겨 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
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
  const 담긴줄들 = async (): Promise<장바구니줄[]> => ((await (await page.request.get('/api/cart')).json()) as { items: 장바구니줄[] }).items;

  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('옵션이 없는 상품을 「장바구니 담기」로 담는다', async () => {
      await 상세.열기(옵션없는상품.id);
      await 상세.상품명().waitFor();
      await 머리.로그아웃버튼().waitFor();
      await verify(
        '회원으로 로그인해 있다 · 장바구니가 비어 있다',
        [await 머리.로그아웃버튼().isVisible(), (await 담긴줄들()).length],
        [true, 0],
        { blocker: true },
      );
      await 상세.장바구니담기버튼().click();
      await 머리.장바구니배지().waitFor();
      await verify('「장바구니 담기」를 누르면 토스트 「장바구니에 담았습니다」가 보인다', await 알림.문구('장바구니에 담았습니다').isVisible(), true);
      await verify('담으면 머리글 배지 숫자가 갱신된다', await 머리.장바구니배지().innerText(), '1');
    });

    await test.step('같은 상품 · 같은 옵션을 다시 담는다', async () => {
      await verify(
        '같은 상품이 장바구니에 담겨 있다',
        (await 담긴줄들()).map((줄) => 줄.productId),
        [옵션없는상품.id],
        { blocker: true },
      );
      const 담기응답 = page.waitForResponse((응답) => 응답.url().includes('/api/cart') && 응답.request().method() === 'POST');
      await 상세.장바구니담기버튼().click();
      await 담기응답;
      const 줄들 = await 담긴줄들();
      await verify('같은 상품 · 같은 옵션을 다시 담으면 줄이 늘지 않고 수량이 더해진다', [줄들.length, 줄들[0]?.qty], [1, 2]);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
