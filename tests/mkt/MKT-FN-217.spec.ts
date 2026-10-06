import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { png파일 } from './components/files.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-217',
  name: '이미지를 첨부하면 입력칸 아래에 미리보기가 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
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

    await test.step('글쓰기 화면에 png 이미지 한 장을 첨부한다', async () => {
      await 쓰기.열기();
      await verify('글쓰기 화면이 열린다', await 쓰기.제목글.isVisible(), true, { blocker: true });
      await 쓰기.이미지올리기(png파일('미리보기.png'));
      await 쓰기.미리보기기다리기(1);
      await verify(
        '이미지를 첨부하면 입력칸 아래에 미리보기가 보인다',
        { 보임: await 쓰기.미리보기.first().isVisible(), 아래: await 쓰기.미리보기가입력칸아래인가() },
        { 보임: true, 아래: true },
      );
    });

    await test.step('미리보기의 X 버튼을 누른다', async () => {
      await 쓰기.이미지빼기버튼.click();
      await verify('미리보기 X 를 누르면 그 이미지가 빠진다', await 쓰기.미리보기.count(), 0);
    });
  } finally {
    await 정리.비우기();
  }
});
