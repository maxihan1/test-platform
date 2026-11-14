import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나, 앱다시켜기 } from './helpers/app.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-620',
  name: '로그인 없이 해시태그 피드를 열면 우리 서버는 해시태그 피드를 로그인 없이도 공개한다(hashtag_feeds = public)',
  platforms: ['android'],
  held: '보류 — 앱이 로그인 없이 해시태그 피드를 여는 길',
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });

  await test.step('로그인 없이 해시태그 피드를 연다', async () => {
    await 앱다시켜기(driver);
    await verify('로그인 없이 해시태그 피드를 열면 우리 서버는 해시태그 피드를 로그인 없이도 공개한다(hashtag_feeds = public)', await 문구가보이나(driver, '#<태그>'), true);
  }, { capture: true });
});
