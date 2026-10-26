import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-291',
  name: '「기본 이미지로」를 누르면 프로필 미리보기가 기본 사진으로 돌아간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원정보수정화면(page);
  let 회원 = { loginId: '', password: '' };
  let 기본그림 = '';

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원 = await 일회용회원으로로그인(page);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
  });

  await test.step('회원정보 수정에서 비밀번호를 확인한다', async () => {
    await 화면.열기();
    await 화면.수정칸까지(회원.password);
    기본그림 = await 화면.사진미리보기주소();
    await verify('프로필 사진 미리보기가 보인다', await 화면.사진미리보기.isVisible(), true, { blocker: true });
  });

  await test.step('프로필 사진 png 를 올린다', async () => {
    await 화면.사진올리기('시험.png', 1000);
    await 화면.올린사진미리보기.waitFor();
  });

  await test.step('올린 사진이 미리보기에 보이는지 확인한다', async () => {
    await verify('미리보기가 올린 사진으로 바뀌어 있다', (await 화면.사진미리보기주소()) !== 기본그림, true, { blocker: true });
  });

  await test.step('사진을 올린 뒤 「기본 이미지로」를 누른다', async () => {
    await 화면.기본이미지로.click();
    await verify('「기본 이미지로」를 누르면 프로필 미리보기가 기본 사진으로 돌아간다', (await 화면.사진미리보기주소()) === 기본그림, true);
  });
});
