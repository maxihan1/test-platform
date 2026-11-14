import { defineCase, test, verify } from '@platform/kit';

import { 가입서버고르기 } from './helpers/onboarding.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 서버규칙화면 } from './pages/server-rules.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-033',
  name: '서버를 고르고 완료 키나 「다음」을 누르면 진행 창 뒤에 다음 단계로 간다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 서버화면 = new 서버고르기화면(driver);
  const 규칙 = new 서버규칙화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로에서 mastodon.maxihan.com 을 고르고 「다음」을 누른다', async () => {
    await 가입서버고르기(driver);
    await 서버화면.다음누르기();
    await verify('서버를 고르고 완료 키나 「다음」을 누르면 진행 창 뒤에 다음 단계로 간다', await 규칙.떴나(), true);
  }, { capture: true });
});
