import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { MB, png파일 } from './components/files.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-215',
  name: '5MB 이미지를 첨부하면 미리보기가 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
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
      await 쓰기.확인창받기('accept');
    });

    await test.step('글쓰기 화면에 5MB 짜리 png 이미지를 첨부한다', async () => {
      await 쓰기.열기();
      await verify('글쓰기 화면이 열린다', await 쓰기.제목글.isVisible(), true, { blocker: true });
      await 쓰기.이미지올리기(png파일('오메가.png', 5 * MB));
      await 쓰기.미리보기기다리기(1);
      await verify('5MB 이미지를 첨부하면 미리보기가 보인다', await 쓰기.미리보기.first().isVisible(), true);
    });

    await test.step('5MB 를 넘는 png 이미지를 첨부한다', async () => {
      await 쓰기.이미지올리기(png파일('초과.png', 5 * MB + 1));
      const 토스트 = await 쓰기.토스트.기다리기('5MB 이하 파일만 올릴 수 있습니다');
      await verify('5MB 를 넘는 이미지는 토스트 「5MB 이하 파일만 올릴 수 있습니다」가 보인다', await 토스트.isVisible(), true);
    });

    await test.step('작은 png 이미지를 더 첨부해 3장을 채운다', async () => {
      await 쓰기.이미지올리기(png파일('작은1.png'), png파일('작은2.png'));
      await 쓰기.미리보기기다리기(3);
      await verify('이미지 3장을 첨부하면 미리보기가 3장 보인다', await 쓰기.미리보기.count(), 3);
    });

    await test.step('넷째 png 이미지를 첨부한다', async () => {
      await 쓰기.이미지올리기(png파일('넷째.png'));
      const 토스트 = await 쓰기.토스트.기다리기('이미지는 최대 3장까지 첨부할 수 있습니다');
      await verify('넷째 이미지는 토스트 「이미지는 최대 3장까지 첨부할 수 있습니다」가 보인다', await 토스트.isVisible(), true);
    });
  } finally {
    await 정리.비우기();
  }
});
