import { defineCase, test, verify } from '@platform/kit';

import { 넉넉한상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-223',
  name: '「<N>명이 보고 있어요」는 5초가 지나면 숫자가 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await page.clock.install();

  const 읽은값 = new Array<number>();

  await test.step('상품 상세를 열고 5초를 보낸다', async () => {
    await 상세.열기(상품.id);
    await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
    const 전 = await 상세.보고있는사람수();
    읽은값.push(전);
    let 후 = 전;
    for (let 회 = 0; 회 < 4 && 후 === 전; 회 += 1) {
      await page.clock.runFor(5000);
      후 = await 상세.보고있는사람수();
      읽은값.push(후);
    }
    await verify('「<N>명이 보고 있어요」는 5초가 지나면 숫자가 바뀐다', 후 !== 전, true);
  });

  await test.step('보고 있는 사람 수를 확인한다', async () => {
    for (let 회 = 0; 회 < 6; 회 += 1) {
      await page.clock.runFor(5000);
      읽은값.push(await 상세.보고있는사람수());
    }
    const 하한 = await verify('숫자가 모두 3 이상이다', Math.min(...읽은값) >= 3, true);
    const 상한 = await verify('숫자가 모두 30 이하다', Math.max(...읽은값) <= 30, true);
    await verify('「<N>명이 보고 있어요」의 숫자는 3~30 사이다', 하한 && 상한, true);
  });
});
