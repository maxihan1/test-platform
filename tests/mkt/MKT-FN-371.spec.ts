import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 파일만들기, MB } from './helpers/files.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-371',
  name: '3MB jpg 를 고르면 「2MB 이하 파일만 올릴 수 있습니다」가 보인다',
  techniques: ['동등 분할'],
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

    await test.step('회원정보 수정에서 3MB jpg 를 고른다', async () => {
      await 프로필.사진고르기(파일만들기('큰사진.jpg', 3 * MB));
      await 프로필.사진오류.waitFor();
      await verify('3MB jpg 를 고르면 「2MB 이하 파일만 올릴 수 있습니다」가 보인다', (await 프로필.사진오류.innerText()).trim(), '2MB 이하 파일만 올릴 수 있습니다');
    });
  } finally {
    await 탈퇴(page.request);
  }
});
