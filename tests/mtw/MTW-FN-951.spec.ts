import { defineCase, test, verify } from '@platform/kit';

import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-951',
  name: '글이 없는 실시간 피드 「이 서버」를 열면 「로컬 타임라인에 아무것도 없습니다. 아무거나 적어 보세요!」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['로컬 피드 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 실시간피드화면(page);
  const 풀기목록: 풀기[] = [];

  try {
    await test.step('글이 없는 실시간 피드 「이 서버」를 연다', async () => {
      await 한국어로(page);
      풀기목록.push(await 가짜응답(page, /\/api\/v1\/timelines\/public/, { 본문: [] }));
      await 화면.열기();
      await verify('실시간 피드에 「이 서버」 탭이 보인다', await 화면.이서버탭.isVisible(), true, { blocker: true });
      const 보인다 = await 화면.이서버빈안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('글이 없는 실시간 피드 「이 서버」를 열면 「로컬 타임라인에 아무것도 없습니다. 아무거나 적어 보세요!」가 보인다', 보인다, true);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
