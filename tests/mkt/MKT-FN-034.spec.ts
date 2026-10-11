import { defineCase, test, verify } from '@platform/kit';

import type { Dialog } from '@playwright/test';
import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 새가입값, 새계정치우기 } from './helpers/member.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';
import { 가입완료화면 } from './pages/signup-done.page.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-034',
  name: '새 아이디로 가입하면 가입 완료 화면에 「{이름}님, 가입을 환영합니다」 와 「로그인하러 가기」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: [
    '회원가입 화면을 열었다',
    '새 아이디로 가입한 계정을 쓴다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 완료 = new 가입완료화면(page);
  const 로그인 = new 로그인화면(page);
  const 탈퇴 = new 회원탈퇴화면(page);
  const 머리 = new 머리글(page);
  const 값 = 새가입값();
  let 확인창: Dialog | undefined;
  let 눌림: Promise<void> | undefined;

  try {
    await 방해막기(page);

    await test.step('새 아이디로 칸을 다 채우고 「가입하기」 를 누른다', async () => {
      await 가입.열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await 가입.모두채우기(값);
      await 가입.가입하기버튼.click();
      await 완료.환영문구.filter({ hasText: 값.이름 }).waitFor();
      await verify(
        '새 아이디로 가입하면 가입 완료 화면에 「{이름}님, 가입을 환영합니다」 와 「로그인하러 가기」 버튼이 보인다',
        { 환영: await 완료.환영문구.innerText(), 로그인하러가기: await 완료.로그인하러가기.isVisible() },
        { 환영: `${값.이름}님, 가입을 환영합니다`, 로그인하러가기: true },
      );
    });

    await test.step('새 계정으로 로그인해 회원 탈퇴 화면에서 확인 체크박스를 켜고 「탈퇴하기」 를 누른다', async () => {
      await 로그인.열기();
      await 로그인.입력하기(값.아이디, 값.비밀번호);
      await 로그인.누르기();
      await 머리.로그아웃버튼.waitFor();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await 탈퇴.열기();
      await 탈퇴.확인체크.check();
      const 열림 = page.waitForEvent('dialog');
      눌림 = 탈퇴.탈퇴하기버튼.click();
      눌림.catch(() => undefined);
      확인창 = await 열림;
      await verify('「탈퇴하기」 를 누르면 브라우저 확인 창 「정말 탈퇴하시겠습니까?」 가 뜬다', 확인창.message(), '정말 탈퇴하시겠습니까?');
    });

    await test.step('탈퇴 확인 창에서 확인을 누른다', async () => {
      if (확인창 === undefined || 눌림 === undefined) throw new Error('탈퇴 확인 창이 뜨지 않았다');
      await 확인창.accept();
      await 눌림;
      await 머리.로그인링크.waitFor();
      await verify(
        '탈퇴 확인 창에서 확인하면 로그아웃되어 홈 화면으로 간다',
        { 경로: new URL(page.url()).pathname, 로그아웃버튼: await 머리.로그아웃버튼.isVisible() },
        { 경로: '/', 로그아웃버튼: false },
      );
    });

    await test.step('탈퇴한 아이디로 다시 로그인한다', async () => {
      await 로그인.열기();
      await 로그인.입력하기(값.아이디, 값.비밀번호);
      await 로그인.응답받으며누르기();
      await 로그인.오류문구.filter({ hasText: /\S/ }).waitFor();
      await verify('탈퇴한 아이디로 로그인하면 로그인되지 않는다', await 머리.로그아웃버튼.isVisible(), false);
    });
  } finally {
    await 새계정치우기(page.request, { loginId: 값.아이디, password: 값.비밀번호 });
  }
});
