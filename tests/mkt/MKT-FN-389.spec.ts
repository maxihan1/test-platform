import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-389',
  name: '회원정보 이름을 1자로 고쳐 저장하면 「이름은 2~10자입니다」가 보인다',
  precondition: ['새로 가입한 회원이 회원정보 수정에서 비밀번호 확인을 마쳤다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  let 정보!: 회원정보;
  const 프로필 = new 회원정보수정화면(page);
  const 알림 = new 토스트(page);

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('회원정보 수정에서 비밀번호를 맞게 확인한다', async () => {
      await 프로필.열기();
      await 프로필.비밀번호확인하기(정보.password);
    });

    await test.step('정보 수정 칸이 열렸는지 확인한다', async () => {
      await verify('회원정보 수정 정보 칸이 열려 있다', await 프로필.이름.isEditable(), true, { blocker: true });
    });

    await test.step('이름을 1자로 고치고 「저장」을 누른다', async () => {
      await 프로필.이름.fill('김');
      await 프로필.저장.click();
      await 프로필.수정오류.filter({ hasText: /\S/ }).waitFor();
      await verify('회원정보 이름을 1자로 고쳐 저장하면 「이름은 2~10자입니다」가 보인다', (await 프로필.수정오류.innerText()).trim(), '이름은 2~10자입니다');
    });

    await test.step('이름을 2자로 고치고 「저장」을 누른다', async () => {
      await 알림.글('저장되었습니다').waitFor({ state: 'detached' });
      await 프로필.이름.fill('김데');
      await 프로필.저장.click();
      await 알림.글('저장되었습니다').waitFor();
      await verify('회원정보 이름을 2자로 고쳐 저장하면 이름 오류 글자가 보이지 않는다', await 프로필.수정오류.isVisible(), false);
    });

    await test.step('이름을 10자로 고치고 「저장」을 누른다', async () => {
      await 알림.글('저장되었습니다').waitFor({ state: 'detached' });
      await 프로필.이름.fill('가나다라마바사아자차');
      await 프로필.저장.click();
      await 알림.글('저장되었습니다').waitFor();
      await verify('회원정보 이름을 10자로 고쳐 저장하면 이름 오류 글자가 보이지 않는다', await 프로필.수정오류.isVisible(), false);
    });

    await test.step('이름 칸에 11자를 넣고 「저장」을 누른다', async () => {
      await 알림.글('저장되었습니다').waitFor({ state: 'detached' });
      await 프로필.이름.fill('가나다라마바사아자차카');
      await 프로필.저장.click();
      await 알림.글('저장되었습니다').waitFor();
      await verify('회원정보 이름 칸에 11자를 넣고 저장하면 이름 오류 글자가 보이지 않는다', await 프로필.수정오류.isVisible(), false);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
