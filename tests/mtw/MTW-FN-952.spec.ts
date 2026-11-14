import { defineCase, test, verify } from '@platform/kit';

import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-952',
  name: '글이 없는 실시간 피드 「다른 서버」를 열면 「여기엔 아직 아무 것도 없습니다! 공개적으로 무언가 포스팅하거나, 다른 서버의 사용자를 팔로우 해서 채워보세요」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['다른 서버 · 모두 피드 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 실시간피드화면(page);
  const 풀기목록: 풀기[] = [];

  try {
    await test.step('글이 없는 실시간 피드 「다른 서버」를 연다', async () => {
      await 한국어로(page);
      풀기목록.push(await 가짜응답(page, /\/api\/v1\/timelines\/public/, { 본문: [] }));
      await 화면.다른서버열기();
      await verify('실시간 피드에 「다른 서버」 탭이 보인다', await 화면.다른서버탭.isVisible(), true, { blocker: true });
      const 보인다 = await 화면.다른서버빈안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('글이 없는 실시간 피드 「다른 서버」를 열면 「여기엔 아직 아무 것도 없습니다! 공개적으로 무언가 포스팅하거나, 다른 서버의 사용자를 팔로우 해서 채워보세요」가 보인다', 보인다, true);
    });

    await test.step('글이 없는 실시간 피드 「모두」를 연다', async () => {
      await 화면.모두열기();
      await verify('실시간 피드에 「모두」 탭이 보인다', await 화면.모두탭.isVisible(), true, { blocker: true });
      const 보인다 = await 화면.다른서버빈안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('글이 없는 「모두」에도 같은 빈 화면 안내가 보인다', 보인다, true);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
