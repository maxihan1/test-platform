import { defineCase, test, verify } from '@platform/kit';

import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 유행중화면 } from './pages/explore.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-947',
  name: '유행 글 응답이 500 이면 유행 중 화면이 깨지지 않고 오류 안내가 보인다',
  techniques: ['오류 추정'],
  precondition: ['유행 글 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 유행중화면(page);
  const 풀기목록: 풀기[] = [];

  try {
    await test.step('유행 글 응답을 500 으로 바꾸고 유행 중 화면을 연다', async () => {
      await 한국어로(page);
      풀기목록.push(await 가짜응답(page, /\/api\/v1\/trends\/statuses/, { 상태: 500, 본문: { error: '서버 오류' } }));
      await 화면.열기();
      await verify('유행 중 화면에 「게시물」 탭이 보인다', await 화면.게시물탭.isVisible(), true, { blocker: true });
      const 깨지지않음 = await verify('유행 중 화면이 깨지지 않는다', await 화면.해시태그탭.isVisible(), true);
      const 안내 = await 화면.알림.모두.filter({ hasText: /\S/ }).first().waitFor({ timeout: 5_000 }).then(() => true, () => false);
      const 오류안내 = await verify('오류 안내가 보인다', 안내, true);
      await verify('유행 글 응답이 500 이면 유행 중 화면이 깨지지 않고 오류 안내가 보인다', 깨지지않음 && 오류안내, true);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
