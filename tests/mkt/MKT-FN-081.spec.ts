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
  tcId: 'MKT-FN-081',
  name: '배송 희망일은 2일 뒤부터 14일 뒤까지만 고를 수 있고 일요일을 고르면 안내가 보이고 넘어가지 않는다',
  precondition: ['배송 정보 단계다', '배송 정보를 맞게 채웠다'],
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
  let 일요일 = '';
  for (let 일수 = 3; 일수 <= 14; 일수 += 1) {
    if (오늘뒤(일수).getDay() === 0) {
      일요일 = 날짜글자(오늘뒤(일수));
      break;
    }
  }

  try {
    await test.step('배송 희망일 선택기의 고를 수 있는 범위를 읽는다', async () => {
      await 화면.바로구매로열기(상품?.id ?? 0);
      await 화면.배송정보제목().waitFor();
      await 머리.로그아웃버튼().waitFor();
      await verify('배송 정보 단계다', await 화면.현재단계().innerText(), '① 배송 정보', { blocker: true });
      await verify(
        '배송 희망일은 오늘로부터 2일 뒤부터 14일 뒤까지만 고를 수 있다',
        [await 화면.배송희망일칸().getAttribute('min'), await 화면.배송희망일칸().getAttribute('max')],
        [날짜글자(오늘뒤(2)), 날짜글자(오늘뒤(14))],
      );
    });

    await test.step('일요일인 배송 희망일을 골라 「다음」을 누른다', async () => {
      await 화면.배송정보채우기('임시회원', '01012345678', '06236', '서울 강남구 테헤란로 123', '4층', 평일(3));
      await verify(
        '배송 정보를 맞게 채웠다',
        [await 화면.받는분칸().inputValue(), await 화면.배송희망일칸().inputValue(), await 화면.안내문구('일요일은 배송하지 않습니다').isVisible()],
        ['임시회원', 평일(3), false],
        { blocker: true },
      );
      await 화면.배송희망일칸().fill(일요일);
      await 화면.다음버튼().click();
      await 화면.안내문구('일요일은 배송하지 않습니다').waitFor();
      await verify('일요일을 고르면 「일요일은 배송하지 않습니다」가 보인다', await 화면.안내문구('일요일은 배송하지 않습니다').isVisible(), true);
      await verify('일요일을 고르면 다음 단계로 넘어가지 않는다', await 화면.현재단계().innerText(), '① 배송 정보');
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
