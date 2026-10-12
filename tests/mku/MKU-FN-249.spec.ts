import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 파일만들기 } from './helpers/files.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-249',
  name: '「기본 이미지로」를 누르면 프로필이 기본 사진으로 돌아간다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보!: 회원정보;
  const 프로필 = new 회원정보수정화면(page);

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('임시 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보.loginId, true, { blocker: true });
    });

    await test.step('회원정보 수정 화면에서 비밀번호를 맞게 다시 적는다', async () => {
      await 프로필.열기();
      await 프로필.비밀번호확인하기(정보.password);
    });

    await test.step('회원정보 수정 칸이 열렸는지 확인한다', async () => {
      await verify('회원정보 수정 칸이 열려 있다', await 프로필.이름.isVisible(), true, { blocker: true });
    });

    await test.step('프로필 사진을 올린 뒤 「기본 이미지로」를 누른다', async () => {
      const 처음 = await 프로필.미리보기주소();
      await 프로필.사진고르기(파일만들기('작은.png', 1000));
      await 프로필.새사진미리보기.waitFor();
      await 프로필.기본이미지로.click();
      await verify('「기본 이미지로」를 누르면 프로필이 기본 사진으로 돌아간다', (await 프로필.미리보기주소()) === 처음, true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
