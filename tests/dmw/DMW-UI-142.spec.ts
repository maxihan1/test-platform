import { defineCase, test, verify } from '@platform/kit';

import { 품절상품 } from './helpers/data.helper.js';
import { 회색인가 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-142',
  name: '품절 상품 카드에 회색 덮개가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 상품목록화면(page);
  const 상품 = await 품절상품(request);
  await 안내창막기(page);

  await test.step('품절 상품 카드를 확인한다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.카드나올때까지내리기(상품.name);
    const 카드 = 목록.카드(상품.name);
    await verify('품절 상품 카드가 목록에 보인다', await 카드.isVisible(), true, { blocker: true });
    const 덮개 = await verify('카드 위에 덮개가 있다', (await 목록.덮개글(카드)) !== 'none', true);
    const 회색 = await verify('덮개 색이 회색이다', 회색인가(await 목록.덮개색(카드)), true);
    await verify('품절 상품 카드에 회색 덮개가 보인다', 덮개 && 회색, true);
  });

  await test.step('품절 상품 카드의 표시를 확인한다', async () => {
    await verify('품절 상품 카드에 「품절」 표시가 보인다', await 목록.덮개글(목록.카드(상품.name)), '"품절"');
  });
});
