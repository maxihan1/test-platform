import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

type 상품요약 = { id: number; name: string; salePrice: number; stock: number };
type 장바구니줄 = { id: number; productId: number };

export const spec = defineCase({
  tcId: 'MKT-UI-029',
  name: '주문서 화면에 단계 표시 · 배송 정보 입력칸 · 입력할 수 없는 주소 칸이 보인다',
  precondition: ['장바구니에 상품이 담겨 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 주문서화면(page);
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
    if (후보.stock < 12 || !(true)) continue;
    const 후보상세 = await (await page.request.get(`/api/products/${후보.id}`)).json();
    if (후보상세.colors.length === 0 && 후보상세.sizes.length === 0) {
      상품 = 후보;
      break;
    }
  }
  await page.request.post('/api/cart', { data: { productId: 상품?.id ?? 0, color: '', size: '', qty: 1 } });
  const 담긴줄 = ((await (await page.request.get('/api/cart')).json()).items as 장바구니줄[]).find((줄) => 줄.productId === 상품?.id);

  try {
    await test.step('주문서 화면을 연다', async () => {
      await 화면.장바구니로열기([담긴줄?.id ?? 0]);
      await 화면.배송정보제목().waitFor();
      await 머리.장바구니배지().waitFor();
      await verify('장바구니에 상품이 담겨 있다', await 머리.장바구니배지().innerText(), '1', { blocker: true });
      await verify(
        '위쪽 단계 표시 「① 배송 정보」 「② 결제 수단」 「③ 최종 확인」이 보인다',
        [await 화면.단계('① 배송 정보').isVisible(), await 화면.단계('② 결제 수단').isVisible(), await 화면.단계('③ 최종 확인').isVisible()],
        [true, true, true],
      );
      await verify('현재 단계 「① 배송 정보」가 강조돼 보인다', await 화면.현재단계().innerText(), '① 배송 정보');
      await verify(
        '배송 정보에 받는 분 · 연락처 · 주소 · 상세 주소 입력칸이 보인다',
        [await 화면.받는분칸().isVisible(), await 화면.연락처칸().isVisible(), await 화면.주소칸().isVisible(), await 화면.상세주소칸().isVisible()],
        [true, true, true, true],
      );
      const 선택지들 = await 화면.배송요청선택지글자들();
      await verify(
        '배송 요청 사항 선택 상자에 「문 앞에 놓아 주세요」 「경비실에 맡겨 주세요」 「직접 입력」이 있다',
        [선택지들.includes('문 앞에 놓아 주세요'), 선택지들.includes('경비실에 맡겨 주세요'), 선택지들.includes('직접 입력')],
        [true, true, true],
      );
      await verify('주소 칸은 직접 입력할 수 없다', await 화면.주소칸().isEditable(), false);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
