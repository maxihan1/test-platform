import { defineCase, test, verify } from '@platform/kit';

import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-015',
  name: '시작 화면에서 「더 알아보기」를 누르면 「Mastodon에 오신 것을 환영합니다」 · 「서버란 무엇인가요?」 설명 하단 시트가 뜬다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('시작 화면에서 「더 알아보기」를 누른다', async () => {
    await 시작.누르기('더알아보기');
    const 환영 = await verify('「Mastodon에 오신 것을 환영합니다」가 보인다', await 시작.시트글이보이나('Mastodon에 오신 것을 환영합니다'), true);
    const 서버란 = await verify('「서버란 무엇인가요?」가 보인다', await 시작.시트글이보이나('서버란 무엇인가요?'), true);
    await verify('시작 화면에서 「더 알아보기」를 누르면 「Mastodon에 오신 것을 환영합니다」 · 「서버란 무엇인가요?」 설명 하단 시트가 뜬다', 환영 && 서버란, true);
  }, { capture: true });
});
