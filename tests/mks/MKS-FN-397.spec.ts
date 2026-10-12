import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKS-FN-397',
  name: '「최신글」 탭을 누르면 게시글이 작성일 최신순으로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.글링크들.first().waitFor();
  });

  await test.step('인기글 탭이 골라져 있는지 확인한다', async () => {
    await verify('홈 게시글 영역에 「인기글」 탭이 골라진 채로 보인다', await 홈.선택된인기글탭.isVisible(), true, { blocker: true });
  });

  await test.step('홈에서 「최신글」 탭을 누른다', async () => {
    await 홈.최신글탭.click();
    await 홈.최신글패널.waitFor();
    await 홈.글링크들.first().waitFor();
    const 날짜들 = await 홈.글날짜들();
    await verify('「최신글」 탭을 누르면 게시글이 작성일 최신순으로 보인다', 날짜들, [...날짜들].sort().reverse());
  });
});
