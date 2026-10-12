import { defineCase, test, verify } from '@platform/kit';

import { 표식 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-146',
  name: '글을 쓰다가 다른 화면으로 가려 하면 브라우저 나가기 확인 창이 뜬다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 정리 = 정리함만들기();
  const 열린창종류: string[] = [];
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

    await test.step('글쓰기에 제목을 적고 다른 화면으로 가려 한다', async () => {
      page.once('dialog', (창) => {
        열린창종류.push(창.type());
        void 창.dismiss();
      });
      await 쓰기.제목칸.click();
      await 쓰기.제목칸.fill(표식('나가기'));
      await 쓰기.취소.click();
      await verify('글을 쓰다가 다른 화면으로 가려 하면 브라우저 나가기 확인 창이 뜬다', 열린창종류.join(','), 'beforeunload');
    });
  } finally {
    await 정리.모두하기();
  }
});
