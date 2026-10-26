import { defineCase, test, verify } from '@platform/kit';

import { 넉넉한상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-152',
  name: '썸네일에 마우스를 올리면 큰 이미지가 그 썸네일 이미지로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);

  await test.step('두 번째 썸네일에 마우스를 올린다', async () => {
    await 상세.열기(상품.id);
    await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
    await 상세.썸네일에올리기(2);
    await 상세.썸네일선택됨까지(2);
    await verify('썸네일에 마우스를 올리면 큰 이미지가 그 썸네일 이미지로 바뀐다', await 상세.큰이미지주소(), await 상세.썸네일그림주소(2));
  });

  await test.step('세 번째 썸네일을 누른다', async () => {
    await 상세.썸네일누르기(3);
    await 상세.썸네일선택됨까지(3);
    await verify('썸네일을 누르면 큰 이미지가 그 썸네일 이미지로 바뀐다', await 상세.큰이미지주소(), await 상세.썸네일그림주소(3));
  });
});
