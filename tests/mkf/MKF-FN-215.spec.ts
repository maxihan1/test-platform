import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-215',
  name: '「탈퇴하기」를 누르면 브라우저 확인 창 「정말 탈퇴하시겠습니까?」가 뜬다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 탈퇴화면 = new 회원탈퇴화면(page);
  let 정보: 회원정보 | undefined;

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('새로 가입한 회원으로 로그인했는지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('회원 탈퇴 화면에서 확인을 켜고 「탈퇴하기」를 누른다', async () => {
      await 탈퇴화면.열기();
      await 탈퇴화면.확인체크.check();
      const 문구대기 = 탈퇴화면.확인창받기('dismiss');
      await 탈퇴화면.탈퇴하기.click();
      await verify('「탈퇴하기」를 누르면 브라우저 확인 창 「정말 탈퇴하시겠습니까?」가 뜬다', await 문구대기, '정말 탈퇴하시겠습니까?');
    });

    await test.step('탈퇴 확인 창에서 「확인」을 누른다', async () => {
      const 문구대기 = 탈퇴화면.확인창받기('accept');
      await 탈퇴화면.탈퇴하기.click();
      await 문구대기;
      await 머리.회원가입.waitFor();
      await verify('탈퇴를 확인하면 홈으로 가고 머리글에 「로그인」이 보인다', [new URL(page.url()).pathname, await 머리.로그인.isVisible()], ['/', true]);
    });
  } finally {
    if (정보 !== undefined) await 탈퇴(page.request);
  }
});
