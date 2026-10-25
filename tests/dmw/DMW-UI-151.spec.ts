import { defineCase, test, verify } from '@platform/kit';

import { 넉넉한상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-151',
  name: '상품 상세 왼쪽에 큰 이미지 한 장과 그 아래 썸네일 4장이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);

  await test.step('상품 상세를 연다', async () => {
    await 상세.열기(상품.id);
    await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
    const 큰그림 = await verify('큰 이미지 한 장이 보인다', await 상세.큰이미지.count(), 1);
    const 썸네일 = await verify('썸네일 4장이 보인다', await 상세.썸네일들.count(), 4);
    const 아래 = await verify('썸네일이 큰 이미지 아래에 있다', await 상세.위에있는가(상세.큰이미지버튼, 상세.썸네일들.first()), true);
    const 왼쪽 = await verify('큰 이미지가 상품 정보 왼쪽에 있다', await 상세.왼쪽에있는가(상세.큰이미지버튼, 상세.제목), true);
    await verify('상품 상세 왼쪽에 큰 이미지 한 장과 그 아래 썸네일 4장이 보인다', 큰그림 && 썸네일 && 아래 && 왼쪽, true);
  });
});
