import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 파일만들기 } from './helpers/files.helper.js';
import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-134',
  name: 'gif 파일을 고르면 토스트 「jpg, png 파일만 올릴 수 있습니다」가 보인다',
  precondition: ['회원으로 로그인해 글쓰기 화면을 열어 두었다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 알림 = new 토스트(page);
  const 정리 = 정리함만들기();
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

    await test.step('이미지 첨부에 gif 파일을 고른다', async () => {
      await 쓰기.이미지고르기(파일만들기('그림.gif', 1));
      await 알림.글('jpg, png 파일만 올릴 수 있습니다').first().waitFor();
      await verify('gif 파일을 고르면 토스트 「jpg, png 파일만 올릴 수 있습니다」가 보인다', await 알림.글('jpg, png 파일만 올릴 수 있습니다').first().isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});

