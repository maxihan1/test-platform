import { defineCase, test, verify } from '@platform/kit';

import { 서버 } from './helpers/app.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-035',
  name: '로그인 경로 서버 고르기에 앞뒤 공백과 대문자를 섞은 「  MASTODON.MAXIHAN.COM  」을 적으면 서버 주소의 대소문자와 앞뒤 공백은 무시한다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 서버화면 = new 서버고르기화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('로그인 경로 서버 고르기를 연다', async () => {
    await 시작.누르기('로그인');
    await verify('서버 고르기 입력칸이 보인다', await 서버화면.떴나(), true, { blocker: true });
  });
  await test.step('로그인 경로 서버 고르기에 앞뒤 공백과 대문자를 섞은 「  MASTODON.MAXIHAN.COM  」을 적는다', async () => {
    await 서버화면.서버적기('  MASTODON.MAXIHAN.COM  ');
    await verify('로그인 경로 서버 고르기에 앞뒤 공백과 대문자를 섞은 「  MASTODON.MAXIHAN.COM  」을 적으면 서버 주소의 대소문자와 앞뒤 공백은 무시한다', await 서버화면.맨위카드가될때까지(서버), true);
  }, { capture: true });
});
