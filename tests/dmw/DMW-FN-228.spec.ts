import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 두프레임기다리기 } from './helpers/common-tools.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품들, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-228',
  name: '「선택 삭제」를 누르면 「선택한 상품 1개를 삭제하시겠습니까?」 확인 창이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 장바구니 = new 장바구니화면(page);
  const 확인창 = new 모달(page, '확인');
  const [지울상품, 남길상품] = await 넉넉한상품들(request, 2, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  await 상품담기(page.request, 지울상품, 1);
  await 상품담기(page.request, 남길상품, 1);

  try {
    await test.step('줄 하나만 체크하고 「선택 삭제」를 누른다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 둘 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
      await 장바구니.줄체크(남길상품.name).uncheck();
      await verify('줄 하나만 체크되어 있다', await 장바구니.체크줄수(), 1, { blocker: true });
      await 장바구니.선택삭제.click();
      await 확인창.뜰때까지();
      await verify('「선택 삭제」를 누르면 「선택한 상품 1개를 삭제하시겠습니까?」 확인 창이 보인다', await 확인창.본문.innerText(), '선택한 상품 1개를 삭제하시겠습니까?');
    });

    await test.step('확인 창에서 「확인」을 누른다', async () => {
      const 삭제응답 = page.waitForResponse((r) => /\/api\/cart\/\d+$/.test(r.url()) && r.request().method() === 'DELETE', { timeout: 8000 }).then(
        () => true,
        () => false,
      );
      await 확인창.버튼('확인').click();
      await 확인창.사라질때까지();
      await 삭제응답;
      await 두프레임기다리기(page);
      await verify('선택 삭제 확인 창에서 「확인」을 누르면 체크한 줄이 지워진다', await 장바구니.줄(지울상품.name).count(), 0);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
