import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 오류응답걸기 } from './helpers/mock.helper.js';
import { 옵션상품번호 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-087',
  name: '리뷰 응답이 500 이면 「리뷰를 불러오지 못했습니다」 와 「다시 시도」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['리뷰 응답은 500 UNAVAILABLE 가짜 응답(모킹)이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  let 해제: (() => Promise<void>) | undefined;

  try {
    await test.step('상품 상세 화면을 연다', async () => {
      await 방해막기(page);
      await 상세.열기(옵션상품번호);
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await verify('상품 상세에 「리뷰」 탭이 보인다', await 상세.탭(/^리뷰/).isVisible(), true, { blocker: true });
    });

    await test.step('리뷰 응답을 500 으로 주고 리뷰 탭을 누른다', async () => {
      해제 = await 오류응답걸기(page.context(), /\/api\/products\/\d+\/reviews/, 500, { code: 'UNAVAILABLE', message: '서비스를 사용할 수 없습니다' });
      await 상세.탭(/^리뷰/).click();
      await 상세.리뷰불러오는중.waitFor({ state: 'detached' });
      await verify(
        '리뷰 응답이 500 이면 「리뷰를 불러오지 못했습니다」 와 「다시 시도」 버튼이 보인다',
        { 문구: await 상세.리뷰불러오기실패.isVisible(), 다시시도: await 상세.다시시도.isVisible() },
        { 문구: true, 다시시도: true },
      );
    });

    await test.step('가짜 응답을 풀고 「다시 시도」 를 누른다', async () => {
      await 해제?.();
      해제 = undefined;
      await 상세.다시시도.click();
      await 상세.리뷰불러오는중.waitFor({ state: 'detached' });
      await verify('「다시 시도」 를 누르면 리뷰를 다시 불러와 리뷰 목록이 보인다', (await 상세.리뷰들.count()) > 0, true);
    });
  } finally {
    await 해제?.();
  }
});
