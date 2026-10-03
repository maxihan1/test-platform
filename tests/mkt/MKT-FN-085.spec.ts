import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 머리글 } from './components/header.component.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';

type 상품요약 = { id: number; name: string; salePrice: number; stock: number };

const 날짜글자 = (날: Date): string =>
  `${날.getFullYear()}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;

const 평일 = (일수: number): string => {
  const 날 = new Date();
  날.setDate(날.getDate() + 일수);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  return 날짜글자(날);
};

export const spec = defineCase({
  tcId: 'MKT-FN-085',
  name: '재고 부족 응답이 오면 안내 문구가 화면에 보이고 주문 완료 화면으로 가지 않는다',
  precondition: ['주문 요청이 재고 부족으로 거절되는 가짜 응답이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 주문서화면(page);
  const 완료 = new 주문완료화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 상품들 = (await (await page.request.get('/api/products?size=100')).json()).items as 상품요약[];
  let 상품: 상품요약 | undefined;
  for (const 후보 of 상품들) {
    if (후보.stock < 12) continue;
    const 후보상세 = await (await page.request.get(`/api/products/${후보.id}`)).json();
    if (후보상세.colors.length === 0 && 후보상세.sizes.length === 0) {
      상품 = 후보;
      break;
    }
  }
  const 안내 = `재고가 부족한 상품이 있습니다: ${상품?.name ?? ''}`;
  let 가짜응답횟수 = 0;
  await page.context().route('**/api/orders', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    가짜응답횟수 += 1;
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: 'OUT_OF_STOCK', message: 안내 }) });
  });

  try {
    await test.step('주문서 세 단계를 지나 최종 확인 단계에서 동의를 체크한다', async () => {
      await 화면.바로구매로열기(상품?.id ?? 0);
      await 화면.배송정보제목().waitFor();
      await 머리.로그아웃버튼().waitFor();
      await 화면.배송정보채우기('임시회원', '01012345678', '06236', '서울 강남구 테헤란로 123', '4층', 평일(3));
      await 화면.다음버튼().click();
      await 화면.결제수단제목().waitFor();
      await 화면.결제수단라디오('계좌이체').check();
      await 화면.다음버튼().click();
      await 화면.최종확인제목().waitFor();
      await 화면.동의체크().check();
    });

    await test.step('결제하기를 누른다', async () => {
      await 화면.결제버튼().click();
      await 알림.영역().waitFor();
      await verify('주문 요청이 재고 부족으로 거절되는 가짜 응답이다', 가짜응답횟수, 1);
      await verify('재고가 모자라면 「재고가 부족한 상품이 있습니다: {상품명}」이 보인다', await 알림.문구(안내).isVisible(), true);
      await verify('재고가 모자라면 주문 완료 화면으로 가지 않는다', [await 완료.제목().isVisible(), await 화면.최종확인제목().isVisible()], [false, true]);
    });
  } finally {
    await page.context().unrouteAll({ behavior: 'wait' });
    await page.request.delete('/api/me');
  }
});
