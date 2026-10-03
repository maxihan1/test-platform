import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 주소검색창 } from './pages/address-popup.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

type 상품요약 = { id: number; name: string; salePrice: number; stock: number };

export const spec = defineCase({
  tcId: 'MKT-FN-080',
  name: '「주소 검색」을 누르면 새 창이 열리고 결과를 고르면 새 창이 닫히고 우편번호 · 주소 칸이 채워진다',
  precondition: ['배송 정보 단계다', '주소 검색 새 창이 열려 있다'],
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

  try {
    await test.step('「주소 검색」을 누른다', async () => {
      await 화면.바로구매로열기(상품?.id ?? 0);
      await 화면.배송정보제목().waitFor();
      await 머리.로그아웃버튼().waitFor();
      await verify('배송 정보 단계다', await 화면.현재단계().innerText(), '① 배송 정보', { blocker: true });
      const 팝업대기 = page.waitForEvent('popup');
      await 화면.주소검색버튼().click();
      const 팝업 = await 팝업대기;
      await new 주소검색창(팝업).제목().waitFor();
      await verify('「주소 검색」을 누르면 새 창으로 주소 검색이 열린다', [new URL(팝업.url()).pathname, await new 주소검색창(팝업).제목().isVisible()], ['/popup/address', true]);
      await 팝업.close();
    });

    await test.step('검색어를 넣고 결과 하나를 고른다', async () => {
      const 팝업대기 = page.waitForEvent('popup');
      await 화면.주소검색버튼().click();
      const 팝업 = await 팝업대기;
      const 새창 = new 주소검색창(팝업);
      await 새창.제목().waitFor();
      await verify('주소 검색 새 창이 열려 있다', await 새창.검색어칸().isVisible(), true, { blocker: true });
      await 새창.검색하기('테헤란로');
      await 새창.결과('테헤란로').waitFor();
      const 닫힘 = 팝업.waitForEvent('close');
      await 새창.결과('테헤란로').click();
      await 닫힘;
      await verify('결과를 고르면 새 창이 닫힌다', 팝업.isClosed(), true);
      await verify(
        '결과를 고르면 주문서의 우편번호 · 주소 칸이 채워진다',
        [(await 화면.우편번호칸().inputValue()) !== '', (await 화면.주소칸().inputValue()) !== ''],
        [true, true],
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
