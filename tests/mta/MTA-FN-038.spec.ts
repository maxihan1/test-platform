import { defineCase, test, verify } from '@platform/kit';

import { 확인창 } from './components/dialog.component.js';
import { 문구가보이나 } from './helpers/app.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-038',
  name: 'Mastodon이 아닌 서버를 고르면 「오류」 창에 「<서버>는 마스토돈 서버인 것 같지 않습니다.」와 서버 응답 문구가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 서버화면 = new 서버고르기화면(driver);
  const 창 = new 확인창(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('로그인 경로 서버 고르기를 연다', async () => {
    await 시작.누르기('로그인');
    await verify('서버 고르기 입력칸이 보인다', await 서버화면.떴나(), true, { blocker: true });
  });
  await test.step('로그인 경로에서 Mastodon 서버가 아닌 example.com 을 적고 「다음」을 누른다', async () => {
    await 서버화면.입력하고카드고르기('example.com', 'example.com');
    await 서버화면.다음누르기();
    const 창뜸 = await verify('「오류」 창이 뜬다', await 창.떴나(30_000), true);
    const 창제목 = await verify('창 제목이 「오류」다', await 창.제목글(), '오류');
    const 안내 = await verify('「<서버>는 마스토돈 서버인 것 같지 않습니다.」가 보인다', await 문구가보이나(driver, '<서버>는 마스토돈 서버인 것 같지 않습니다.'), true);
    const 응답 = await verify('안내 뒤에 서버 응답 문구가 이어진다', (await 창.본문글()).replace(/^.*마스토돈 서버인 것 같지 않습니다\.\s*/s, '').trim() !== '', true);
    await verify('Mastodon이 아닌 서버를 고르면 「오류」 창에 「<서버>는 마스토돈 서버인 것 같지 않습니다.」와 서버 응답 문구가 보인다', 창뜸 && 창제목 && 안내 && 응답, true);
  }, { capture: true });
});
