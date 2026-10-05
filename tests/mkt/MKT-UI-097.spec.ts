import { defineCase, test, verify } from '@platform/kit';

import { 상품번호 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-097',
  name: '상품명 아래에 「{N}명이 보고 있어요」가 보이고 N 은 3~30 사이다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 상세를 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 상세.열기(상품번호.니트가디건);
    await 상세.보고있어요.waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    const 수 = await 상세.본숫자();
    const 범위안 = 수 !== null && 수 >= 3 && 수 <= 30;
    const 아래 = await 상세.보고있어요가상품명아래에있나();
    await verify('상품명 아래에 「{N}명이 보고 있어요」가 보이고 N 은 3~30 사이다', `${범위안 ? 'N 은 3~30 사이' : `N 이 범위 밖(${수})`} · ${아래 ? '상품명 아래' : '상품명 아래가 아님'}`, 'N 은 3~30 사이 · 상품명 아래');
  });
});
