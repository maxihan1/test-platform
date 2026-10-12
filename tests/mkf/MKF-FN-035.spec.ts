import { defineCase, test, verify } from '@platform/kit';

import { 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-035',
  name: '인기글 제목을 누르면 그 글의 게시글 상세가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 상세 = new 게시글상세화면(page);
  let 눌린제목 = '';
  let 눌린주소 = '';

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열고 인기글 목록이 보이는지 확인한다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.글링크들.first().waitFor();
    눌린제목 = await 홈.글링크들.first().innerText();
    눌린주소 = (await 홈.글링크들.first().getAttribute('href')) ?? '';
    await verify('인기글 목록에 글 5건이 보인다', await 홈.글링크들.count(), 5, { blocker: true });
  });

  await test.step('인기글 목록의 첫 글 제목을 누른다', async () => {
    await 홈.글링크들.first().click();
    await 상세.제목.waitFor();
    await verify(
      '인기글 제목을 누르면 그 글의 게시글 상세가 보인다',
      { 주소: 경로(page), 제목: await 상세.제목.innerText() },
      { 주소: 눌린주소, 제목: 눌린제목 },
    );
  });
});
