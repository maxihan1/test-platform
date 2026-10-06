import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 댓글달기 } from './components/data.component.js';
import { 고유이름, 내글만들기, 댓글여럿달기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-206',
  name: '답글이 0개인 댓글을 삭제하면 댓글이 목록에서 사라진다',
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '내 글에 답글 없는 댓글이 하나 있다',
    '내 글에 답글이 1개 달린 댓글이 있다',
  ],
  techniques: ['경계값 분석'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);
    const 외톨이 = 고유이름('답글없는댓글');
    const 부모 = 고유이름('답글달린댓글');
    const 답글 = 고유이름('남는답글');
    let 글번호 = 0;

    await test.step('새로 만든 회원으로 로그인하고 댓글 둘과 답글 하나가 달린 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      글번호 = (await 내글만들기(page.request, 정리)).id;
      await 댓글여럿달기(page.request, 글번호, [외톨이]);
      const 부모번호 = (await 댓글달기(page.request, 글번호, 부모)).id;
      await 댓글달기(page.request, 글번호, 답글, 부모번호);
    });

    await test.step('내 글 상세를 열고 댓글이 보이는지 확인한다', async () => {
      await 안내창끄기(page);
      await 상세.열기(글번호);
      await 상세.댓글(답글).waitFor();
      await verify('내 글에 달린 댓글과 답글이 보인다', await 상세.댓글제목(3).isVisible(), true, { blocker: true });
    });

    await test.step('답글이 없는 댓글의 「삭제」를 누른다', async () => {
      await 상세.댓글삭제버튼(외톨이).click();
      await 상세.댓글제목(2).waitFor();
      await verify('답글이 0개인 댓글을 삭제하면 댓글이 목록에서 사라진다', await 상세.댓글(외톨이).count(), 0);
    });

    await test.step('답글이 달린 댓글의 「삭제」를 누른다', async () => {
      await 상세.댓글삭제버튼(부모).click();
      await 상세.댓글제목(1).waitFor();
      await verify('답글이 1개 달린 댓글을 삭제하면 그 자리에 「삭제된 댓글입니다」가 남는다', await 상세.삭제된댓글표시.isVisible(), true);
      await verify('지운 댓글의 답글은 그대로 보인다', await 상세.댓글(답글).isVisible(), true);
    });
  } finally {
    await 정리.비우기();
  }
});
