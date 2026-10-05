import { defineCase, test, verify } from '@platform/kit';

import { 상품번호 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-259',
  name: '셋째 썸네일을 누르면 큰 이미지가 셋째 이미지로 바뀐다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 번호 = 상품번호.니트가디건;

  await test.step('상품 상세를 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 상세.열기(번호);
    await 상세.썸네일(3).waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('상품 상세에서 셋째 썸네일을 누른다', async () => {
    await 상세.썸네일(3).click();
    await verify('셋째 썸네일을 누르면 큰 이미지가 셋째 이미지로 바뀐다', await 상세.큰이미지주소(), `/img/p/${번호}/3`);
  });

  await test.step('둘째 썸네일에 마우스를 올린다', async () => {
    await 상세.썸네일(2).hover();
    await verify('썸네일에 마우스를 올리면 큰 이미지가 그 이미지로 바뀐다', await 상세.큰이미지주소(), `/img/p/${번호}/2`);
  });
});
