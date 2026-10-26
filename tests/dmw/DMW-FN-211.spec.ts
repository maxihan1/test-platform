import { defineCase, test, verify } from '@platform/kit';

import { 넉넉한상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-211',
  name: '수량이 1이면 「−」가 눌리지 않아 수량이 0이 되지 않는다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);

  await test.step('수량 1에서 「−」를 확인한다', async () => {
    await 상세.열기(상품.id);
    await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
    const 눌림없음 = await verify('「−」가 눌리지 않는다', await 상세.수량줄이기.isDisabled(), true);
    await 상세.수량줄이기.click({ force: true });
    const 그대로 = await verify('수량이 1이다', await 상세.수량읽기(), 1);
    await verify('수량이 1이면 「−」가 눌리지 않아 수량이 0이 되지 않는다', 눌림없음 && 그대로, true);
  });

  await test.step('수량 칸이 1인지 확인한다', async () => {
    await verify('상품 상세 수량은 1에서 시작한다', await 상세.수량읽기(), 1);
  });

  await test.step('「+」를 눌러 수량을 10까지 올린다', async () => {
    for (let 회 = 1; 회 < 10; 회 += 1) await 상세.수량늘리기.click();
    await verify('수량이 10이면 「+」가 눌리지 않는다', await 상세.수량늘리기.isDisabled(), true);
  });

  await test.step('수량 10에서 수량 칸 값을 확인한다', async () => {
    await 상세.수량늘리기.click({ force: true });
    await verify('「+」로는 수량이 11이 되지 않는다', await 상세.수량읽기(), 10);
  });
});
