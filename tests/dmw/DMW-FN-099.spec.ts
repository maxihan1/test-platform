import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-099',
  name: '「로그아웃」을 누르면 「로그아웃 하시겠습니까?」 확인 창이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 확인창 = new 모달(page, '확인');
  await 안내창막기(page);
  await 일회용회원으로로그인(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('회원으로 로그인해 있다', await 홈.머리.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('머리글 「로그아웃」을 누른다', async () => {
    await 홈.머리.로그아웃누르기();
    await 확인창.뜰때까지();
    await verify('「로그아웃」을 누르면 「로그아웃 하시겠습니까?」 확인 창이 보인다', await 홈.로그아웃확인문구().isVisible(), true);
  });

  await test.step('확인 창의 「확인」을 누른다', async () => {
    await 확인창.버튼('확인').click();
    await 홈.머리.로그인.waitFor();
    const 홈화면보임 = await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true);
    const 로그인보임 = await verify('머리글에 「로그인」이 보인다', await 홈.머리.로그인.isVisible(), true);
    await verify('로그아웃 확인 창에서 「확인」을 누르면 홈 화면으로 가고 머리글에 「로그인」이 보인다', 홈화면보임 && 로그인보임, true);
  });
});
