import { defineCase, test, verify } from '@platform/kit';

import { 상품번호 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-286',
  name: '리뷰는 상세를 열 때가 아니라 「리뷰」 탭을 처음 누를 때 불러온다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 리뷰요청들: string[] = [];
  page.on('request', (요청) => {
    if (/\/api\/products\/\d+\/reviews/.test(요청.url())) 리뷰요청들.push(요청.url());
  });

  await test.step('상품 상세를 열고 「리뷰」 탭을 처음 누른다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 상세.열기(상품번호.니트가디건);
    await 상세.리뷰탭.waitFor();
    await 머리.로그인링크.waitFor();
    await page.waitForLoadState('networkidle');
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    const 열때 = 리뷰요청들.length;
    const 요청 = page.waitForRequest((r) => /\/api\/products\/\d+\/reviews/.test(r.url()));
    await 상세.리뷰탭.click();
    await 요청;
    await verify('리뷰는 상세를 열 때가 아니라 「리뷰」 탭을 처음 누를 때 불러온다', `상세를 열 때 ${열때}번 · 탭을 누른 뒤 ${리뷰요청들.length}번`, '상세를 열 때 0번 · 탭을 누른 뒤 1번');
  });
});
