import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-011',
  name: '홈을 열어 둔 채 새 댓글이 달리면 새로 고치지 않아도 12초 안에 알림 수 「1」이 보인다',
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
    await test.step('회원으로 로그인해 내 글을 만들고 홈을 연다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      남 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(남));
      글번호 = (await 글하나쓰기(나.api, '알림글')).id;
      await page.goto('/');
    });

    await test.step('알림이 없는 홈이 열렸는지 확인한다', async () => {
      await 머리.알림종.waitFor();
      await verify('회원으로 로그인해 있고 알림 수가 보이지 않는다', (await 로그인해있나(page.request)) && !(await 머리.알림수.isVisible()), true, { blocker: true });
    });

    await test.step('홈을 열어 둔 채 다른 회원이 내 글에 댓글을 단다', async () => {
      await 댓글달기(남.api, 글번호, '홈을 열어 둔 채 단 댓글');
      await 머리.알림수.waitFor({ timeout: 12_000 });
      await verify('홈을 열어 둔 채 새 댓글이 달리면 새로 고치지 않아도 12초 안에 알림 수 「1」이 보인다', await 머리.알림수.innerText(), '1');
    });
  } finally {
    await 정리.모두하기();
  }
});
