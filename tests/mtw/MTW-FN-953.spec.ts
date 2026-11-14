import { defineCase, test, verify } from '@platform/kit';

import { 가짜응답, 초기상태바꾸기, type 풀기 } from './helpers/mock.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-953',
  name: '피드를 끈 설정으로 실시간 피드를 열면 「이 피드는 서버 관리자에 의해 비활성화되었습니다.」가 보인다',
  techniques: ['결정 테이블'],
  precondition: ['서버 설정의 피드 접근 값은 가짜 응답(모킹)이다', '피드 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 실시간피드화면(page);
  const 풀기목록: 풀기[] = [];

  try {
    await test.step('피드를 끈 설정으로 실시간 피드를 연다', async () => {
      풀기목록.push(await 초기상태바꾸기(page, { local_live_feed_access: 'disabled', remote_live_feed_access: 'disabled' }));
      풀기목록.push(await 가짜응답(page, /\/api\/v1\/timelines\/public/, { 본문: [] }));
      await 한국어로(page);
      await 화면.열기();
      await verify('실시간 피드 화면이 열려 있다', new URL(page.url()).pathname, '/public/local', { blocker: true });
      const 보인다 = await 화면.비활성안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('피드를 끈 설정으로 실시간 피드를 열면 「이 피드는 서버 관리자에 의해 비활성화되었습니다.」가 보인다', 보인다, true);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
