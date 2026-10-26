import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 나타나는가, 응답을오류로돌리기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-509',
  name: '상품 목록 응답이 서버 오류면 화면이 깨지지 않고 오류 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: ['비회원이다', '상품 목록 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 알림 = new 토스트(page);
  await 안내창막기(page);
  const 풀기 = await 응답을오류로돌리기(page, /\/api\/products\?/, 'GET', 500, { code: 'INTERNAL', message: '서버 오류가 발생했습니다' });

  try {
    await test.step('상품 목록 응답을 서버 오류로 둔 채 상품 목록을 연다', async () => {
      await 목록.이동();
      await 목록.제목.waitFor();
      await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
      const 안내 = await verify('오류 안내가 보인다', await 나타나는가(알림.모두.first()), true);
      const 필터 = await verify('필터가 그대로 보인다', await 목록.필터.isVisible(), true);
      await verify('상품 목록 응답이 서버 오류면 화면이 깨지지 않고 오류 안내가 보인다', 안내 && 필터, true);
    });
  } finally {
    await 풀기();
  }
});
