import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 댓글달기, 글만들기, 표식 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 댓글목록, 둘째회원열기, 둘째회원정리하기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-008',
  name: '내 글에 새 댓글이 달린 뒤 홈을 열면 알림 종 옆에 읽지 않은 알림 수 「1」이 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 남!: 둘째회원;
  let 글번호 = 0;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 내 글을 만든다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = await 글만들기(나.api, { category: '자유', title: 표식('알림글'), content: '알림을 받아 볼 내 글입니다' });
    });

    await test.step('내 글에 다른 회원이 댓글을 단다', async () => {
      남 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(남));
      await 댓글달기(남.api, 글번호, '알림 확인용 댓글');
    });

    await test.step('내 글에 다른 회원 댓글이 달렸는지 확인한다', async () => {
      await verify('내 글에 다른 회원 댓글이 하나 있다', (await 댓글목록(나.api, 글번호)).length, 1, { blocker: true });
    });

    await test.step('다른 회원이 내 글에 댓글을 단 뒤 홈을 연다', async () => {
      await page.goto('/');
      await 머리.알림종.waitFor();
      await 머리.알림수.waitFor();
      await verify('내 글에 새 댓글이 달린 뒤 홈을 열면 알림 종 옆에 읽지 않은 알림 수 「1」이 보인다', await 머리.알림수.innerText(), '1');
    });
  } finally {
    await 정리.모두하기();
  }
});
