import { defineCase, test, verify } from '@platform/kit';
import { 서버규칙화면까지 } from './helpers/signup-flow.helper.js';
import { 서버규칙화면 } from './pages/rules.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-044',
  name: '「서버 규칙」 화면에 규칙 줄이 한 건도 보이지 않는다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 규칙 = new 서버규칙화면(driver);

  await test.step('가입 경로에서 우리 서버를 고르고 「서버 규칙」 화면을 연다', async () => {
    await 서버규칙화면까지(driver);
    await verify('「서버 규칙」 화면 안내 글이 보인다', await 규칙.그려질때까지(), true, { blocker: true });
  });

  await test.step('「서버 규칙」 화면의 규칙 목록을 확인한다', async () => {
    await verify('「서버 규칙」 화면에 규칙 줄이 한 건도 보이지 않는다', await 규칙.규칙줄수(), 0);
  });
});
