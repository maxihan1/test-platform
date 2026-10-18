import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 세션회원있는가, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보 } from './helpers/data.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-232',
  name: '옵션을 모두 고르고 담으면 토스트 「장바구니에 담았습니다」가 나온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 색상과 사이즈 옵션이 있고 품절이 아닌 상품').default(5),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 알림 = new 토스트(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 상태인지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    await test.step('옵션 상품에서 「색상」 · 「사이즈」를 고르고 「장바구니 담기」를 누른다', async () => {
      const 정보 = await 상품정보(page.request, params.productId);
      await 상세.열기(params.productId);
      await verify('옵션 상품 상세 화면이 열려 있다', await 상세.색상.isVisible(), true, { blocker: true });
      await 상세.옵션고르기(정보.colors[0] ?? '', 정보.sizes[0] ?? '');
      await 상세.담기.click();
      const 알림글 = await (await 알림.아무거나뜰때까지()).innerText();
      await verify('옵션을 모두 고르고 담으면 토스트 「장바구니에 담았습니다」가 나온다', 알림글, '장바구니에 담았습니다');
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
