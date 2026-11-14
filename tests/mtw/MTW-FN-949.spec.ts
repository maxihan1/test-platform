import { defineCase, test, verify } from '@platform/kit';

import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 유행중화면 } from './pages/explore.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-949',
  name: '유행 글이 없는 유행 중 화면을 열면 「아직 유행하는 것이 없습니다. 나중에 다시 확인하세요!」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['유행 글 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 유행중화면(page);
  const 풀기목록: 풀기[] = [];

  try {
    await test.step('유행 글이 없는 유행 중 화면을 연다', async () => {
      await 한국어로(page);
      풀기목록.push(await 가짜응답(page, /\/api\/v1\/trends\/statuses/, { 본문: [] }));
      await 화면.열기();
      await verify('유행 중 화면에 「게시물」 탭이 보인다', await 화면.게시물탭.isVisible(), true, { blocker: true });
      const 보인다 = await 화면.비었음.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('유행 글이 없는 유행 중 화면을 열면 「아직 유행하는 것이 없습니다. 나중에 다시 확인하세요!」가 보인다', 보인다, true);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
