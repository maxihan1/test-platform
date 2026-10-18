import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 세션회원있는가, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니목록 } from './helpers/data.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-239',
  name: '「장바구니 담기」를 누르면 토스트 「장바구니에 담았습니다」가 나온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 알림 = new 토스트(page);
  const 상태: { 회원?: 회원정보; 전?: number } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 상태인지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    await test.step('옵션 없는 상품 상세에서 「장바구니 담기」를 누른다', async () => {
      상태.전 = (await 장바구니목록(page.request)).length;
      await 상세.열기(params.productId);
      await verify('옵션 없는 상품 상세 화면이 열려 있다', await 상세.담기.isVisible(), true, { blocker: true });
      await 상세.담기.click();
      const 알림글 = await (await 알림.아무거나뜰때까지()).innerText();
      await verify('「장바구니 담기」를 누르면 토스트 「장바구니에 담았습니다」가 나온다', 알림글, '장바구니에 담았습니다');
    });

    await test.step('담은 뒤 머리글 장바구니 배지를 확인한다', async () => {
      await 상세.머리글.좁으면메뉴열기();
      await 상세.머리글.장바구니배지.waitFor();
      const 후 = Number(await 상세.머리글.장바구니배지.innerText());
      await verify('「장바구니 담기」를 누르면 머리글 배지 숫자가 1 오른다', 후 - (상태.전 ?? 0), 1);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
