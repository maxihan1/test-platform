import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-239',
  name: '비밀번호를 맞게 다시 적으면 이름 · 이메일 · 휴대폰 · 관심 분야 칸을 고칠 수 있다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  let 정보!: 회원정보;
  const 프로필 = new 회원정보수정화면(page);
  const 알림 = new 토스트(page);

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('임시 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보.loginId, true, { blocker: true });
    });

    await test.step('회원정보 수정에서 비밀번호를 맞게 다시 적고 확인한다', async () => {
      await 프로필.열기();
      await 프로필.비밀번호확인하기(정보.password);
      await verify('비밀번호를 맞게 다시 적으면 이름 · 이메일 · 휴대폰 · 관심 분야 칸을 고칠 수 있다', [await 프로필.이름.isEditable(), await 프로필.이메일.isEditable(), await 프로필.휴대폰.isEditable(), await 프로필.관심분야('패션').isEnabled(), await 프로필.관심분야('전자기기').isEnabled(), await 프로필.관심분야('도서').isEnabled(), await 프로필.관심분야('식품').isEnabled()].every(Boolean), true);
    });

    await test.step('이름을 바꿔 저장한 뒤 화면을 새로 고친다', async () => {
      await 프로필.이름.fill('바뀐이름');
      await 프로필.저장.click();
      await 알림.글('저장되었습니다').waitFor();
      await page.reload();
      await 머리.로그아웃.waitFor();
      await verify('이름을 바꿔 저장한 뒤 화면을 새로 고치면 머리글에 바뀐 이름이 보인다', (await 머리.인사.innerText()).includes('바뀐이름'), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
