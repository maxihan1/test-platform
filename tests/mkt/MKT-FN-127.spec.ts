import { defineCase, test, verify } from '@platform/kit';

import { 제목으로글찾기, 표식 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 로그인해있나, 본문글, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-127',
  name: '분류를 고르지 않고 「등록」을 누르면 글이 등록되지 않는다',
  precondition: ['회원으로 로그인해 글쓰기 화면을 열어 두었다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 정리 = 정리함만들기();
  const 제목 = 표식('분류없음');
  let 나!: 글쓴이;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      await 쓰기.열기();
    });

    await test.step('글쓰기 화면이 열렸는지 확인한다', async () => {
      await 쓰기.준비될때까지();
      await verify('회원으로 로그인해 글쓰기 화면을 열어 두었다', (await 로그인해있나(page.request)) && (await 쓰기.제목.isVisible()), true, { blocker: true });
    });

    await test.step('분류를 고르지 않고 제목과 본문을 채워 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 제목, 본문: 본문글(20) });
      await 쓰기.등록하고응답받기();
      await verify('분류를 고르지 않고 「등록」을 누르면 글이 등록되지 않는다', (await 제목으로글찾기(page.request, 제목)).length, 0);
    });
  } finally {
    await 정리.모두하기();
  }
});
