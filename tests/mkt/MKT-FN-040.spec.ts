import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-040',
  name: '탈퇴 안내를 확인하고 「탈퇴하기」를 누르면 로그아웃되어 홈 화면으로 가고 다시 로그인할 수 없다',
  precondition: ['새로 가입한 회원이 로그인해 있다', '탈퇴 안내를 확인했다', '방금 탈퇴한 회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원탈퇴화면(page);
  const 머리 = new 머리글(page);
  const 로그인 = new 로그인화면(page);
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('회원 탈퇴 화면에서 「위 내용을 확인했습니다」를 체크한다', async () => {
      await 화면.열기();
      await 머리.로그아웃버튼().waitFor();
      await 화면.확인체크().waitFor();
      await verify('새로 가입한 회원이 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
      const 체크전막힘 = await 화면.탈퇴버튼().isDisabled();
      await 화면.확인체크().check();
      await verify('「위 내용을 확인했습니다」를 체크해야 「탈퇴하기」 버튼이 눌린다', [체크전막힘, await 화면.탈퇴버튼().isEnabled()], [true, true]);
    });

    await test.step('「탈퇴하기」를 누르고 확인 창에서 확인한다', async () => {
      await verify('탈퇴 안내를 확인했다', await 화면.확인체크().isChecked(), true, { blocker: true });
      let 확인창문구 = '';
      page.once('dialog', async (창) => {
        확인창문구 = 창.message();
        await 창.accept();
      });
      await 화면.탈퇴버튼().click();
      await 머리.로그인링크().waitFor();
      await verify(
        '확인 창 「정말 탈퇴하시겠습니까?」에서 확인하면 로그아웃되어 홈 화면으로 간다',
        [확인창문구, new URL(page.url()).pathname, await 머리.로그아웃버튼().isVisible()],
        ['정말 탈퇴하시겠습니까?', '/', false],
      );
    });

    await test.step('탈퇴한 아이디로 로그인한다', async () => {
      await verify('방금 탈퇴한 회원이다', await 머리.로그인링크().isVisible(), true, { blocker: true });
      await 로그인.열기();
      await 로그인.로그인하기(아이디, 비밀번호);
      await 로그인.오류문구().waitFor();
      await verify('탈퇴한 아이디로는 로그인할 수 없다', await 머리.로그아웃버튼().isVisible(), false);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
