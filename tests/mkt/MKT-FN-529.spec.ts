import { defineCase, test, verify } from '@platform/kit';

import { 상품번호 } from './components/data.component.js';
import { 리뷰응답실패걸기, 리뷰응답풀기 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-529',
  name: '리뷰를 불러오지 못하면 「리뷰를 불러오지 못했습니다」와 「다시 시도」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '리뷰 응답은 가짜 응답(모킹)이다 — 500 UNAVAILABLE'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);

  try {
    await test.step('리뷰 응답이 실패하는 채 「리뷰」 탭을 누른다', async () => {
      await 리뷰응답실패걸기(page);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 상세.열기(상품번호.니트가디건);
      await 상세.리뷰탭.waitFor();
      await 머리.로그인링크.waitFor();
      await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await 상세.리뷰탭.click();
      await 상세.리뷰실패문구.waitFor();
      const 보임 = await Promise.all([상세.리뷰실패문구.isVisible(), 상세.다시시도버튼.isVisible()]);
      await verify('리뷰를 불러오지 못하면 「리뷰를 불러오지 못했습니다」와 「다시 시도」 버튼이 보인다', 보임, [true, true]);
    });

    await test.step('가짜 응답을 풀고 「다시 시도」를 누른다', async () => {
      await 리뷰응답풀기(page);
      await 상세.다시시도로리뷰불러오기();
      await 상세.리뷰목록.first().waitFor();
      await verify('「다시 시도」를 누르면 리뷰를 다시 불러와 리뷰 목록이 보인다', (await 상세.리뷰목록.count()) > 0, true);
    });
  } finally {
    await 리뷰응답풀기(page);
  }
});
