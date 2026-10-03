import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

type 상품요약 = { id: number; name: string; salePrice: number; stock: number };

const 날짜글자 = (날: Date): string =>
  `${날.getFullYear()}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;

const 평일 = (일수: number): string => {
  const 날 = new Date();
  날.setDate(날.getDate() + 일수);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  return 날짜글자(날);
};

const 숫자 = (글자: string): number => Number(글자.replace(/\D/g, ''));

export const spec = defineCase({
  tcId: 'MKT-FN-083',
  name: '최종 확인에 상품 · 배송 정보 · 결제 수단과 금액이 맞게 보이고 동의를 체크해야 결제하기 버튼이 눌린다',
  precondition: ['최종 확인 단계다'],
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
  let 수량 = 1;
  for (const 후보 of 상품들) {
    if (후보.stock < 12) continue;
    const 맞는수량 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((개수) => 후보.salePrice * 개수 >= 50000 && 후보.salePrice * 개수 < 55000);
    if (맞는수량 === undefined) continue;
    const 후보상세 = await (await page.request.get(`/api/products/${후보.id}`)).json();
    if (후보상세.colors.length === 0 && 후보상세.sizes.length === 0) {
      상품 = 후보;
      수량 = 맞는수량;
      break;
    }
  }

  try {
    await test.step('최종 확인 화면을 읽는다', async () => {
      await 화면.바로구매로열기(상품?.id ?? 0, 수량);
      await 화면.배송정보제목().waitFor();
      await 머리.로그아웃버튼().waitFor();
      await 화면.배송정보채우기('임시회원', '01012345678', '06236', '서울 강남구 테헤란로 123', '4층', 평일(3));
      await 화면.다음버튼().click();
      await 화면.결제수단제목().waitFor();
      await 화면.쿠폰선택().selectOption({ label: '10% 할인 (최대 5,000원)' });
      await 화면.결제수단라디오('계좌이체').check();
      await 화면.다음버튼().click();
      await 화면.최종확인제목().waitFor();
      await verify('최종 확인 단계다', await 화면.현재단계().innerText(), '③ 최종 확인', { blocker: true });
      await verify(
        '최종 확인에 상품 목록 · 배송 정보 · 결제 수단이 보인다',
        [await 화면.최종확인소제목('상품 목록').isVisible(), await 화면.최종확인소제목('배송 정보').isVisible(), await 화면.최종확인소제목('결제 수단').isVisible()],
        [true, true, true],
      );
      const 상품금액 = 숫자(await 화면.최종확인금액칸('상품 금액').innerText());
      const 쿠폰할인 = 숫자(await 화면.최종확인금액칸('쿠폰 할인').innerText());
      const 배송비 = 숫자(await 화면.최종확인금액칸('배송비').innerText());
      const 최종금액 = 숫자(await 화면.최종확인금액칸('최종 결제 금액').innerText());
      await verify(
        '최종 결제 금액은 상품 금액에서 쿠폰 할인을 빼고 배송비를 더한 값이다',
        [쿠폰할인 > 0, 최종금액 === 상품금액 - 쿠폰할인 + 배송비],
        [true, true],
      );
      await verify(
        '배송비는 쿠폰을 적용하기 전 상품 금액으로 정해진다',
        [상품금액 >= 50000, 상품금액 - 쿠폰할인 < 50000, 배송비],
        [true, true, 0],
      );
    });

    await test.step('동의 체크박스를 체크하지 않은 채 결제하기 버튼을 본다', async () => {
      await verify(
        '「주문 내용을 확인했으며 결제에 동의합니다」를 체크하기 전에는 결제하기 버튼이 눌리지 않는다',
        [await 화면.동의체크().isChecked(), await 화면.결제버튼().isDisabled()],
        [false, true],
      );
    });

    await test.step('「주문 내용을 확인했으며 결제에 동의합니다」를 체크한다', async () => {
      const 최종금액 = 숫자(await 화면.최종확인금액칸('최종 결제 금액').innerText());
      await 화면.동의체크().check();
      await verify(
        '체크하면 「{금액}원 결제하기」 버튼이 눌린다',
        [await 화면.결제버튼().isEnabled(), await 화면.결제버튼().innerText()],
        [true, `${최종금액.toLocaleString('en-US')}원 결제하기`],
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
