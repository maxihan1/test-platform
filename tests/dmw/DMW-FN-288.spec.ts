import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-288',
  name: '맞는 비밀번호로 확인하면 이름 · 이메일 · 휴대폰 · 관심 분야 칸이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원정보수정화면(page);
  let 회원 = { loginId: '', password: '' };

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원 = await 일회용회원으로로그인(page);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
  });

  await test.step('회원정보 수정을 연다', async () => {
    await 화면.열기();
    await verify('비밀번호 재확인 단계가 보인다', await 화면.비밀번호확인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('맞는 비밀번호로 「비밀번호 확인」을 누른다', async () => {
    await 화면.수정칸까지(회원.password);
    const 이름 = await verify('이름 칸이 보인다', await 화면.이름칸.isVisible(), true);
    const 이메일 = await verify('이메일 칸이 보인다', await 화면.이메일칸.isVisible(), true);
    const 휴대폰 = await verify('휴대폰 칸이 보인다', await 화면.휴대폰칸.isVisible(), true);
    const 관심 = await verify('관심 분야 칸이 보인다', await 화면.관심분야.isVisible(), true);
    await verify('맞는 비밀번호로 확인하면 이름 · 이메일 · 휴대폰 · 관심 분야 칸이 보인다', 이름 && 이메일 && 휴대폰 && 관심, true);
  });

  await test.step('비밀번호를 확인한 뒤 아이디 칸을 확인한다', async () => {
    await verify('맞는 비밀번호로 확인하면 아이디 칸은 고칠 수 없게 흐리게 보인다', await 화면.아이디칸.isDisabled(), true);
  });
});
