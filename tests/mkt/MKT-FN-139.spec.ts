import { defineCase, test, verify } from '@platform/kit';

import { 파일만들기 } from './helpers/files.helper.js';
import { 글쓴이정리하기, 로그인해있나, 아래에있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-139',
  name: 'png 이미지를 고르면 입력칸 아래에 미리보기가 보인다',
  precondition: ['회원으로 로그인해 글쓰기 화면을 열어 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
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

    await test.step('이미지 첨부에 png 파일 하나를 고른다', async () => {
      await 쓰기.이미지고르기(파일만들기('그림.png', 1));
      await 쓰기.미리보기들.first().waitFor();
      await verify('png 이미지를 고르면 입력칸 아래에 미리보기가 보인다', (await 쓰기.미리보기들.first().isVisible()) && (await 아래에있나(쓰기.이미지칸, 쓰기.미리보기들.first())), true);
    });
  } finally {
    await 정리.모두하기();
  }
});

