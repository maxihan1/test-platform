import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 토스트 } from './components/toast.component.js';
import { 장바구니화면 } from './pages/cart.page.js';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { id: number; name: string; salePrice: number; colors: string[]; sizes: string[] };

export const spec = defineCase({
  tcId: 'MKT-FN-078',
  name: '「선택 삭제」의 확인 창에서 확인해도 체크한 줄이 지워지지 않고 체크한 줄이 없으면 안내 토스트가 보인다',
  precondition: ['장바구니에 상품이 둘 담겨 있다', '선택 삭제 확인 창이 열려 있다', '장바구니에 상품이 담겨 있다'],
  params: null,
  expected: null,
  unconfirmed:
    '기획서와 다름 — 차이 D3: 확인 창에서 확인을 눌러도 체크한 줄이 지워지지 않고 화면 오류가 나며 줄이 그대로 남는다 (작성 요청 5873)',
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 창 = new 모달(page);
  const 알림 = new 토스트(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 원 = (금액: number): string => `${금액.toLocaleString('ko-KR')}원`;
  const 후보: 상품상세[] = [];
  for (const 상품 of 목록.filter((항목) => !항목.soldOut)) {
    const 자세히 = (await (await page.request.get(`/api/products/${상품.id}`)).json()) as 상품상세;
    if (자세히.colors.length === 0 && 자세히.sizes.length === 0) 후보.push(자세히);
    if (후보.length === 2) break;
  }
  const 지울상품 = 후보[0] as 상품상세;
  const 남길상품 = 후보[1] as 상품상세;

  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await page.request.post('/api/cart', { data: { productId: 지울상품.id, color: '', size: '', qty: 1 } });
    await page.request.post('/api/cart', { data: { productId: 남길상품.id, color: '', size: '', qty: 1 } });

    await test.step('줄 하나만 체크하고 「선택 삭제」를 누른다', async () => {
      await 장바구니.열기();
      await 장바구니.불러오는중표시().waitFor({ state: 'detached' });
      await verify('장바구니에 상품이 둘 담겨 있다', await 장바구니.줄들().count(), 2, { blocker: true });
      await 장바구니.줄체크(남길상품.name).uncheck();
      await 장바구니.상품금액이(원(지울상품.salePrice)).waitFor();
      await 장바구니.선택삭제버튼().click();
      await 창.창().waitFor();
      await verify(
        '「선택 삭제」를 누르면 확인 창 「선택한 상품 1개를 삭제하시겠습니까?」가 뜬다',
        await 장바구니.삭제확인문구('선택한 상품 1개를 삭제하시겠습니까?').isVisible(),
        true,
      );
    });

    await test.step('확인을 누른다', async () => {
      await verify('선택 삭제 확인 창이 열려 있다', await 창.창().isVisible(), true, { blocker: true });
      await 창.버튼('확인').click();
      await 창.창().waitFor({ state: 'hidden' });
      await verify(
        '확인해도 체크한 줄이 지워지지 않고 그대로 남는다',
        (await 장바구니.줄상품명들().allInnerTexts()).sort(),
        [지울상품.name, 남길상품.name].sort(),
      );
    });

    await test.step('아무것도 체크하지 않고 「선택 삭제」를 누른다', async () => {
      await verify('장바구니에 상품이 담겨 있다', (await 장바구니.줄들().count()) > 0, true, { blocker: true });
      for (const 체크 of await 장바구니.줄체크들().all()) await 체크.uncheck();
      await 장바구니.상품금액이('0원').waitFor();
      await 장바구니.선택삭제버튼().click();
      await 알림.문구('삭제할 상품을 선택하세요').waitFor();
      await verify('아무것도 체크하지 않고 누르면 토스트 「삭제할 상품을 선택하세요」가 보인다', await 알림.문구('삭제할 상품을 선택하세요').isVisible(), true);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
