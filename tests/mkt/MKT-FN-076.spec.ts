import { defineCase, test, verify } from '@platform/kit';

import { 장바구니화면 } from './pages/cart.page.js';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { id: number; name: string; salePrice: number; colors: string[]; sizes: string[] };

export const spec = defineCase({
  tcId: 'MKT-FN-076',
  name: '「전체 선택」과 줄 체크가 서로 맞물리고 체크한 상품이 없으면 「주문하기」 버튼이 눌리지 않는다',
  precondition: ['장바구니에 상품이 둘 담겨 있다', '모든 줄이 해제돼 있다', '모든 줄이 체크돼 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 원 = (금액: number): string => `${금액.toLocaleString('ko-KR')}원`;
  const 후보: 상품상세[] = [];
  for (const 상품 of 목록.filter((항목) => !항목.soldOut)) {
    const 자세히 = (await (await page.request.get(`/api/products/${상품.id}`)).json()) as 상품상세;
    if (자세히.colors.length === 0 && 자세히.sizes.length === 0) 후보.push(자세히);
    if (후보.length === 2) break;
  }
  const 첫째 = 후보[0] as 상품상세;
  const 둘째 = 후보[1] as 상품상세;
  const 체크상태들 = async (): Promise<boolean[]> => {
    const 상태들: boolean[] = [];
    for (const 체크 of await 장바구니.줄체크들().all()) 상태들.push(await 체크.isChecked());
    return 상태들;
  };

  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await page.request.post('/api/cart', { data: { productId: 첫째.id, color: '', size: '', qty: 1 } });
    await page.request.post('/api/cart', { data: { productId: 둘째.id, color: '', size: '', qty: 1 } });

    await test.step('「전체 선택」 체크박스를 해제한다', async () => {
      await 장바구니.열기();
      await 장바구니.불러오는중표시().waitFor({ state: 'detached' });
      await verify('장바구니에 상품이 둘 담겨 있다', await 장바구니.줄들().count(), 2, { blocker: true });
      await 장바구니.전체선택체크().uncheck();
      await 장바구니.상품금액이('0원').waitFor();
      await verify('「전체 선택」을 해제하면 모든 줄이 해제된다', await 체크상태들(), [false, false]);
    });

    await test.step('「전체 선택」 체크박스를 체크한다', async () => {
      await verify('모든 줄이 해제돼 있다', await 체크상태들(), [false, false], { blocker: true });
      await 장바구니.전체선택체크().check();
      await 장바구니.상품금액이(원(첫째.salePrice + 둘째.salePrice)).waitFor();
      await verify('「전체 선택」을 체크하면 모든 줄이 체크된다', await 체크상태들(), [true, true]);
    });

    await test.step('줄 하나를 해제한다', async () => {
      await verify('모든 줄이 체크돼 있다', await 체크상태들(), [true, true], { blocker: true });
      await 장바구니.줄체크(첫째.name).uncheck();
      await 장바구니.상품금액이(원(둘째.salePrice)).waitFor();
      await verify('줄 하나라도 해제하면 「전체 선택」도 해제된다', await 장바구니.전체선택체크().isChecked(), false);
    });

    await test.step('모든 줄을 해제한다', async () => {
      await 장바구니.줄체크(둘째.name).uncheck();
      await 장바구니.상품금액이('0원').waitFor();
      await verify('체크한 상품이 없으면 「주문하기」 버튼이 눌리지 않는다', await 장바구니.주문하기버튼().isDisabled(), true);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
