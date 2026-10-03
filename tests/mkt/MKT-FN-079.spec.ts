import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

type 상품요약 = { id: number; name: string; salePrice: number; stock: number };
type 장바구니줄 = { id: number; productId: number };

const 날짜글자 = (날: Date): string =>
  `${날.getFullYear()}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;

const 평일 = (오늘뒤: number): string => {
  const 날 = new Date();
  날.setDate(날.getDate() + 오늘뒤);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  return 날짜글자(날);
};

export const spec = defineCase({
  tcId: 'MKT-FN-079',
  name: '배송 정보가 맞지 않으면 「다음」을 눌러도 넘어가지 않고 「이전」으로 돌아오면 입력한 값이 남는다',
  precondition: ['장바구니에 상품이 담겨 있다', '배송 정보 단계다', '배송 정보를 맞게 채웠다'],
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
  const 배송일 = 평일(3);

  try {
    await test.step('배송 정보를 비운 채 「다음」을 누른다', async () => {
      await 화면.장바구니로열기([담긴줄?.id ?? 0]);
      await 화면.배송정보제목().waitFor();
      await 머리.장바구니배지().waitFor();
      await verify('장바구니에 상품이 담겨 있다', await 머리.장바구니배지().innerText(), '1', { blocker: true });
      await 화면.다음버튼().click();
      await 화면.안내문구('받는 분을 입력하세요').waitFor();
      await verify('현재 단계 입력이 맞지 않으면 「다음」을 눌러도 다음 단계로 넘어가지 않는다', await 화면.현재단계().innerText(), '① 배송 정보');
    });

    await test.step('배송 요청 사항에서 「직접 입력」을 고른다', async () => {
      await verify('배송 정보 단계다', await 화면.현재단계().innerText(), '① 배송 정보', { blocker: true });
      const 전 = await 화면.배송요청직접입력칸().isVisible();
      await 화면.배송요청선택().selectOption({ label: '직접 입력' });
      await 화면.배송요청직접입력라벨().waitFor();
      await verify('「직접 입력」을 고르면 입력칸이 새로 나온다', [전, await 화면.배송요청직접입력칸().isVisible()], [false, true]);
    });

    await test.step('「다음」을 눌러 결제 수단 단계로 갔다가 「이전」을 누른다', async () => {
      await 화면.배송정보채우기('임시회원', '01012345678', '06236', '서울 강남구 테헤란로 123', '4층', 배송일);
      await verify(
        '배송 정보를 맞게 채웠다',
        [await 화면.받는분칸().inputValue(), await 화면.연락처칸().inputValue(), await 화면.우편번호칸().inputValue(), await 화면.주소칸().inputValue(), await 화면.상세주소칸().inputValue(), await 화면.배송희망일칸().inputValue()],
        ['임시회원', '01012345678', '06236', '서울 강남구 테헤란로 123', '4층', 배송일],
        { blocker: true },
      );
      await 화면.다음버튼().click();
      await 화면.결제수단제목().waitFor();
      await 화면.이전버튼().click();
      await 화면.배송정보제목().waitFor();
      await verify(
        '「이전」으로 돌아가면 입력한 값이 남아 있다',
        [await 화면.받는분칸().inputValue(), await 화면.연락처칸().inputValue(), await 화면.우편번호칸().inputValue(), await 화면.주소칸().inputValue(), await 화면.상세주소칸().inputValue(), await 화면.배송희망일칸().inputValue()],
        ['임시회원', '01012345678', '06236', '서울 강남구 테헤란로 123', '4층', 배송일],
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
