import { defineCase, test, verify } from '@platform/kit';

import { 가입서버고르기 } from './helpers/onboarding.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 서버규칙화면 } from './pages/server-rules.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-044',
  name: '우리 서버는 규칙이 0개라 서버 규칙 화면의 규칙 목록이 비어 있다',
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
  await test.step('가입 경로에서 우리 서버를 고르고 「다음」을 누른다', async () => {
    await 가입서버고르기(driver);
    await 서버화면.다음누르기();
    await verify('서버 규칙 화면이 보인다', await 규칙.떴나(), true, { blocker: true });
    await verify('우리 서버는 규칙이 0개라 서버 규칙 화면의 규칙 목록이 비어 있다', (await 규칙.규칙글자들()).join(', '), '');
  }, { capture: true });
});
