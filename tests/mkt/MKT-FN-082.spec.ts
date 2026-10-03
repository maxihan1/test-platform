import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

type 상품요약 = { id: number; name: string; salePrice: number; stock: number };

const 날짜글자 = (날: Date): string =>
  `${날.getFullYear()}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;

const 오늘뒤 = (일수: number): Date => {
  const 날 = new Date();
  날.setDate(날.getDate() + 일수);
  return 날;
};

const 평일 = (일수: number): string => {
  const 날 = 오늘뒤(일수);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  return 날짜글자(날);
};

export const spec = defineCase({
  tcId: 'MKT-FN-082',
  name: '「신용카드」를 고르면 카드사 · 할부 선택 상자가 나오고 금액이 모자란 할부와 쿠폰은 고를 수 없다',
  precondition: ['결제 수단 단계다', '결제 금액이 50,000원 미만이다', '상품 금액이 30,000원 미만이다'],
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
    if (후보.stock < 12 || !(후보.salePrice < 30000)) continue;
    const 후보상세 = await (await page.request.get(`/api/products/${후보.id}`)).json();
    if (후보상세.colors.length === 0 && 후보상세.sizes.length === 0) {
      상품 = 후보;
      break;
    }
  }

  try {
    await test.step('배송 정보를 채우고 「다음」을 눌러 결제 수단 단계로 간다', async () => {
      await 화면.바로구매로열기(상품?.id ?? 0);
      await 화면.배송정보제목().waitFor();
      await 머리.로그아웃버튼().waitFor();
      await 화면.배송정보채우기('임시회원', '01012345678', '06236', '서울 강남구 테헤란로 123', '4층', 평일(3));
      await 화면.다음버튼().click();
      await 화면.결제수단제목().waitFor();
      await verify('결제 수단 단계다', await 화면.현재단계().innerText(), '② 결제 수단', { blocker: true });
    });

    await test.step('「신용카드」를 고른다', async () => {
      const 전 = [await 화면.카드사선택().isVisible(), await 화면.할부선택().isVisible()];
      await 화면.결제수단라디오('신용카드').check();
      await 화면.결제금액미리보기().waitFor();
      await verify(
        '「신용카드」를 고르면 카드사 선택 상자와 할부 선택 상자가 나온다',
        [...전, await 화면.카드사선택().isVisible(), await 화면.할부선택().isVisible()],
        [false, false, true, true],
      );
    });

    await test.step('「신용카드」를 고르고 할부 선택 상자를 연다', async () => {
      const 결제금액 = Number((await 화면.결제금액미리보기().innerText()).replace(/\D/g, ''));
      await verify('결제 금액이 50,000원 미만이다', 결제금액 < 50000, true, { blocker: true });
      await verify(
        '결제 금액이 50,000원 미만이면 할부 「3개월」 「6개월」을 고를 수 없다',
        [await 화면.할부선택지('3개월').isDisabled(), await 화면.할부선택지('6개월').isDisabled()],
        [true, true],
      );
    });

    await test.step('쿠폰 선택 상자를 연다', async () => {
      const 쿠폰들 = await 화면.쿠폰선택지글자들();
      await verify(
        '쿠폰 선택 상자에 「10% 할인 (최대 5,000원)」과 「3,000원 할인 (30,000원 이상 구매 시)」가 있다',
        [쿠폰들.includes('10% 할인 (최대 5,000원)'), 쿠폰들.includes('3,000원 할인 (30,000원 이상 구매 시)')],
        [true, true],
      );
    });

    await test.step('쿠폰 선택 상자에서 「3,000원 할인 (30,000원 이상 구매 시)」를 고른다', async () => {
      await verify('상품 금액이 30,000원 미만이다', (상품?.salePrice ?? 0) < 30000, true, { blocker: true });
      await verify(
        '조건이 맞지 않는 쿠폰은 흐리게 나오고 고를 수 없다',
        await 화면.쿠폰선택지('3,000원 할인 (30,000원 이상 구매 시)').isDisabled(),
        true,
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
