import { defineCase, test, verify } from '@platform/kit';

import { 가입서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르고다음 } from './helpers/login.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 서버규칙화면 } from './pages/rules.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-033',
  name: '가입 경로에서 mastodon.maxihan.com 을 고르고 「다음」을 누르면 「서버 규칙」 화면으로 간다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 고르기 = new 서버고르기화면(driver);
  const 규칙 = new 서버규칙화면(driver);

  await test.step('앱을 켜서 가입용 서버 고르기 화면을 연다', async () => {
    await 가입서버고르기까지(driver);
    await verify('가입용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
  });

  await test.step('가입 경로에서 mastodon.maxihan.com 을 고르고 「다음」을 누른다', async () => {
    await 서버고르고다음(driver);
    await verify('서버 규칙 안내가 뜬다', await 규칙.그려질때까지(), true);
    await verify('가입 경로에서 mastodon.maxihan.com 을 고르고 「다음」을 누르면 「서버 규칙」 화면으로 간다', await 규칙.글('제목'), '서버 규칙');
  });
});
