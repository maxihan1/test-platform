import { defineCase, test, verify } from '@platform/kit';

import { 화면제목 } from './components/page-heading.component.js';
import { 옵션없는상품 } from './helpers/data.helper.js';
import { 로그인한아이디, 리뷰탭누르기 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-540',
  name: '리뷰 조회가 500 UNAVAILABLE 이어도 상품 상세 화면은 그대로 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['비회원이다', '리뷰 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 제목 = new 화면제목(page);
  const 경로 = /\/api\/products\/\d+\/reviews/;
  let 상품 = { id: 0, name: '' };

  await test.step('비회원으로 상품 상세 화면을 연다', async () => {
    await 안내창막기(page);
    상품 = await 옵션없는상품(request);
    await page.goto(`/shop/${상품.id}`);
    await 제목.글(상품.name).waitFor();
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
    await verify('상품 상세 화면이 보인다', await 제목.글(상품.name).isVisible(), true, { blocker: true });
  });

  try {
    await test.step('리뷰 응답을 500 UNAVAILABLE 로 둔 채 「리뷰」 탭을 누른다', async () => {
      await page.context().route(경로, async (길) => {
        await 길.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'UNAVAILABLE', message: '잠시 후 다시 시도해 주세요' }) });
      });
      await 리뷰탭누르기(page);
      await page.getByText('리뷰를 불러오지 못했습니다').waitFor();
      await verify('리뷰 조회가 500 UNAVAILABLE 이어도 상품 상세 화면은 그대로 보인다', await 제목.글(상품.name).isVisible(), true);
    });
  } finally {
    await page.context().unroute(경로);
  }
});
