import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 내글만들기, 댓글여럿달기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-064',
  name: '게시글 상세 아래에 「댓글 2」 제목과 댓글 목록이 오래된 순으로 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 글에 댓글이 2개 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);
    const 첫째 = 고유이름('먼저쓴댓글');
    const 둘째 = 고유이름('나중쓴댓글');
    let 글번호 = 0;
    let 이름 = '';

    await test.step('새로 만든 회원으로 로그인하고 댓글이 2개 달린 글을 만든다', async () => {
      이름 = (await 회원로그인(page.request, 정리)).name;
      글번호 = (await 내글만들기(page.request, 정리)).id;
      await 댓글여럿달기(page.request, 글번호, [첫째, 둘째]);
    });

    await test.step('내 글 상세를 연다', async () => {
      await 안내창끄기(page);
      await 상세.열기(글번호);
      await 상세.댓글(둘째).waitFor();
      await verify('내 글에 달린 댓글 2개가 보인다', (await 상세.댓글순서읽기()).length, 2, { blocker: true });
      await verify(
        '게시글 상세 아래에 「댓글 2」 제목과 댓글 목록이 오래된 순으로 보인다',
        { 제목: await 상세.댓글제목(2).isVisible(), 순서: await 상세.댓글순서읽기() },
        { 제목: true, 순서: [첫째, 둘째] },
      );
      const 보임: boolean[] = [];
      for (const 내용 of [첫째, 둘째]) {
        보임.push(await 상세.댓글작성자(내용, 이름).isVisible(), await 상세.댓글시각(내용).isVisible(), await 상세.댓글(내용).isVisible());
      }
      await verify('댓글마다 작성자 · 작성 시각 · 내용이 보인다', 보임.every(Boolean), true);
    });
  } finally {
    await 정리.비우기();
  }
});
