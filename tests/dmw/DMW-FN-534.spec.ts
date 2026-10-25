import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-534',
  name: '비밀번호를 비우고 「비밀번호 확인」을 누르면 빈 값 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원정보수정화면(page);
  let 회원아이디 = '';

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원아이디 = (await 일회용회원으로로그인(page)).loginId;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('회원정보 수정을 연다', async () => {
    await 화면.열기();
    await verify('비밀번호 재확인 단계가 보인다', await 화면.비밀번호확인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('비밀번호를 비우고 「비밀번호 확인」을 누른다', async () => {
    await 화면.비밀번호확인('');
    await 화면.재확인오류.waitFor();
    const 보임 = await verify('안내 문구가 보인다', await 화면.재확인오류.isVisible(), true);
    const 문구 = await verify('안내 문구는 「비밀번호가 올바르지 않습니다」다', (await 화면.재확인오류.allInnerTexts()).join(', '), '비밀번호가 올바르지 않습니다');
    await verify('비밀번호를 비우고 「비밀번호 확인」을 누르면 빈 값 안내가 보인다', 보임 && 문구, true);
  });
});
