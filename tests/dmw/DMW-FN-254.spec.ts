import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 기준일뒤, 넉넉한상품, 상품담기, 시험배송정보, 오늘을수요일로옮기기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-254',
  name: '배송 희망일을 1일 뒤로 적으면 「다음」을 눌러도 넘어가지 않는다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    하루뒤: z.number().describe('배송 희망일 — 오늘로부터 며칠 뒤, 1일 뒤 이하(0 이하는 지난 날)').default(1),
    이틀뒤: z.number().describe('배송 희망일 — 오늘로부터 며칠 뒤, 2~14일 중 일요일이 아닌 날(오늘을 수요일로 옮겨 두므로 4일 · 11일 뒤는 일요일)').default(2),
    열나흘뒤: z.number().describe('배송 희망일 — 오늘로부터 며칠 뒤, 2~14일 중 일요일이 아닌 날(오늘을 수요일로 옮겨 두므로 4일 · 11일 뒤는 일요일)').default(14),
    보름뒤: z.number().describe('배송 희망일 — 오늘로부터 며칠 뒤, 15일 뒤 이후').default(15),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  const 줄 = await 상품담기(page.request, 상품, 1);
  const 기준 = await 오늘을수요일로옮기기(page);

  try {
    await test.step('배송 희망일에 오늘로부터 1일 뒤를 적고 「다음」을 누른다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.배송정보채우기({ ...시험배송정보(기준일뒤(기준, params.하루뒤)) });
      await 주문서.다음.click();
      await verify('배송 희망일을 1일 뒤로 적으면 「다음」을 눌러도 넘어가지 않는다', await 주문서.단계글(), '① 배송 정보');
    });
    await test.step('배송 희망일에 오늘로부터 2일 뒤를 적고 「다음」을 누른다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.배송정보채우기({ ...시험배송정보(기준일뒤(기준, params.이틀뒤)) });
      await 주문서.다음.click();
      await verify('배송 희망일을 2일 뒤로 고르면 「② 결제 수단」으로 넘어간다', await 주문서.단계글(), '② 결제 수단');
    });
    await test.step('배송 희망일에 오늘로부터 14일 뒤를 적고 「다음」을 누른다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.배송정보채우기({ ...시험배송정보(기준일뒤(기준, params.열나흘뒤)) });
      await 주문서.다음.click();
      await verify('배송 희망일을 14일 뒤로 고르면 「② 결제 수단」으로 넘어간다', await 주문서.단계글(), '② 결제 수단');
    });
    await test.step('배송 희망일에 오늘로부터 15일 뒤를 적고 「다음」을 누른다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.배송정보채우기({ ...시험배송정보(기준일뒤(기준, params.보름뒤)) });
      await 주문서.다음.click();
      await verify('배송 희망일을 15일 뒤로 적으면 「다음」을 눌러도 넘어가지 않는다', await 주문서.단계글(), '① 배송 정보');
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
