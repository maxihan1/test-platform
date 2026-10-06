import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { gif파일 } from './components/files.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-216',
  name: 'jpg · png 가 아닌 파일을 첨부하면 토스트 「jpg, png 파일만 올릴 수 있습니다」가 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 쓰기 = new 글쓰기화면(page);

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(page.request, 정리);
      await 안내창끄기(page);
    });

    await test.step('글쓰기 화면에 gif 이미지를 첨부한다', async () => {
      await 쓰기.열기();
      await verify('글쓰기 화면이 열린다', await 쓰기.제목글.isVisible(), true, { blocker: true });
      await 쓰기.이미지올리기(gif파일('움직이는.gif'));
      const 토스트 = await 쓰기.토스트.기다리기('jpg, png 파일만 올릴 수 있습니다');
      await verify('jpg · png 가 아닌 파일을 첨부하면 토스트 「jpg, png 파일만 올릴 수 있습니다」가 보인다', await 토스트.isVisible(), true);
      await verify('gif 파일은 미리보기에 들어가지 않는다', await 쓰기.미리보기.count(), 0);
    });
  } finally {
    await 정리.비우기();
  }
});
