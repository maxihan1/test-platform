import { defineCase, test, verify } from '@platform/kit';

import { 서버규칙까지 } from './helpers/onboarding.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 서버규칙화면 } from './pages/server-rules.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-045',
  name: '서버 규칙 화면에서 「동의 안 함」을 누르면 서버 고르기로 돌아간다',
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
  await test.step('가입 경로에서 우리 서버를 고르고 서버 규칙 화면을 연다', async () => {
    await verify('서버 규칙 화면이 보인다', await 서버규칙까지(driver), true, { blocker: true });
  });
  await test.step('서버 규칙 화면에서 「동의 안 함」을 누른다', async () => {
    await 규칙.동의안함누르기();
    const 규칙닫힘 = await verify('서버 규칙 화면이 닫힌다', await 규칙.닫혔나(), true);
    const 고르기열림 = await verify('서버 고르기 화면이 보인다', await 서버화면.떴나(), true);
    await verify('서버 규칙 화면에서 「동의 안 함」을 누르면 서버 고르기로 돌아간다', 규칙닫힘 && 고르기열림, true);
  }, { capture: true });
});
