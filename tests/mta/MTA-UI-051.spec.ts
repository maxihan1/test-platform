import { defineCase, test, verify } from '@platform/kit';
import { 가입양식까지 } from './helpers/signup-flow.helper.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-051',
  name: '가입 양식 「사용자명」 칸 오른쪽에 「@mastodon.maxihan.com」이 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 양식 = new 가입양식화면(driver);

  await test.step('가입 양식을 연다', async () => {
    await 가입양식까지(driver);
    await verify('가입 양식 「사용자명」 칸이 보인다', await 양식.그려질때까지(), true, { blocker: true });
    await verify('가입 양식 「사용자명」 칸 오른쪽에 「@mastodon.maxihan.com」이 보인다', await 양식.도메인글(), '@mastodon.maxihan.com');
  });
});
