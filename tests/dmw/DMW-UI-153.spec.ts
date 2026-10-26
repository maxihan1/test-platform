import { defineCase, test, verify } from '@platform/kit';

import { 두프레임기다리기 } from './helpers/common-tools.helper.js';
import { 넉넉한상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-153',
  name: '큰 이미지를 누르면 화면 전체를 덮는 확대 보기 모달이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);

  await test.step('상품 상세 큰 이미지를 누른다', async () => {
    await 상세.열기(상품.id);
    await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
    await 상세.큰이미지버튼.click();
    await 상세.확대창.waitFor();
    const 보임 = await verify('확대 보기 모달이 보인다', await 상세.확대창.isVisible(), true);
    await 두프레임기다리기(page);
    const 덮음 = await verify('확대 보기 모달이 화면 전체를 덮는다', await 상세.확대창이화면을덮는가(), true);
    await verify('큰 이미지를 누르면 화면 전체를 덮는 확대 보기 모달이 보인다', 보임 && 덮음, true);
  });

  await test.step('확대 보기 위쪽 위치 글자를 확인한다', async () => {
    const 글 = await verify('위치 글자가 「1 / 4」이다', await 상세.확대위치글(), '1 / 4');
    const 상자 = await 상세.확대위치.boundingBox();
    const 높이 = page.viewportSize()?.height ?? 0;
    const 위쪽 = await verify('위치 글자가 화면 위쪽에 있다', 상자 !== null && 상자.y < 높이 / 3, true);
    await verify('확대 보기 위쪽에 「1 / 4」처럼 지금 위치가 보인다', 글 && 위쪽, true);
  });
});
