import { defineCase, test, verify } from '@platform/kit';

import { 내정보, type 회원정보 } from './helpers/account.helper.js';
import { 상품둘을한번에주문한임시회원, 임시회원정리 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-268',
  name: '주문 내역 줄마다 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보인다',
  precondition: ['주문이 있는 회원으로 로그인해 있다', '상품 두 개를 한 번에 주문한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  let 주문번호들: string[] = [];
  const 내주문 = new 내주문내역화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      const 만든 = await 상품둘을한번에주문한임시회원(page.request);
      정보 = 만든.정보;
      주문번호들 = 만든.주문번호들;
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('주문 내역을 연다', async () => {
      await 내주문.열기();
      const 줄들 = await 내주문.줄글들();
      await verify('주문 내역 줄마다 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보인다', 줄들.length > 0 && 줄들.every((칸들) => 칸들.length === 5 && 칸들.every((칸) => 칸 !== '')), true);
      const 여럿 = 줄들.find((칸들) => /외 \d+건$/.test(칸들[2] ?? ''));
      const 건수 = Number(/외 (\d+)건$/.exec(여럿?.[2] ?? '')?.[1] ?? 0);
      const 상품줄수 = 여럿 === undefined ? 0 : ((await (await page.request.get('/api/orders/' + encodeURIComponent(여럿[1] ?? ''))).json()) as { lines: unknown[] }).lines.length;
      await verify('상품이 여럿인 주문은 대표 상품명 뒤에 「외 {N}건」이 붙어 보인다', 여럿 !== undefined && 건수 === 상품줄수 - 1, true);
    });
  } finally {
    if (정보 !== undefined) await 임시회원정리(page.request, 주문번호들);
  }
});
