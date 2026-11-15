import { defineCase, test, verify } from '@platform/kit';
import { 서버규칙화면까지 } from './helpers/signup-flow.helper.js';
import { 서버규칙화면 } from './pages/rules.page.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-045',
  name: '「서버 규칙」 화면에서 「동의 안 함」을 누르면 서버 고르기 화면으로 돌아간다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 규칙 = new 서버규칙화면(driver);
  const 고르기 = new 서버고르기화면(driver);

  await test.step('가입 경로에서 우리 서버를 고르고 「서버 규칙」 화면을 연다', async () => {
    await 서버규칙화면까지(driver);
    await verify('「서버 규칙」 화면 안내 글이 보인다', await 규칙.그려질때까지(), true, { blocker: true });
  });

  await test.step('「서버 규칙」 화면에서 「동의 안 함」을 누른다', async () => {
    await 규칙.동의안함누르기();
    await verify('「서버 규칙」 화면에서 「동의 안 함」을 누르면 서버 고르기 화면으로 돌아간다', await 고르기.그려질때까지(), true);
  });
});
