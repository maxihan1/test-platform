import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 고객센터화면 } from './pages/support.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-382',
  name: 'FAQ 검색칸에 「배송」을 적으면 「반품/교환」 분류의 「반품 배송비는 누가 내나요?」도 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 고객센터 = new 고객센터화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('고객센터 화면을 연다', async () => {
    await 방해막기(page);
    await 고객센터.열기();
  });

  await test.step('고객센터 화면이 열렸는지 확인한다', async () => {
    await 고객센터.제목.waitFor();
    await verify('고객센터 화면이 열려 있다', 경로(page), 고객센터화면.주소, { blocker: true });
  });

  await test.step('고객센터 FAQ 검색칸에 「배송」을 적는다', async () => {
    await 고객센터.검색칸.fill('배송');
    await 고객센터.질문('배송비는 얼마인가요?').waitFor();
    await verify(
      'FAQ 검색칸에 「배송」을 적으면 「반품/교환」 분류의 「반품 배송비는 누가 내나요?」도 보인다',
      await 고객센터.질문('반품 배송비는 누가 내나요?').isVisible(),
      true,
    );
  });
});
