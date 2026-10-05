import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내글만들기, 세션아이디, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 모달 } from './components/feedback.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-181',
  name: '「삭제」를 누르면 모달 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」가 뜬다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '지워도 되는 내 글이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);
    const 목록 = new 게시판목록화면(page);
    const 확인창 = new 모달(page);
    let 글번호 = 0;

    await test.step('새로 만든 회원으로 로그인하고 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      글번호 = (await 내글만들기(page.request, 정리)).id;
    });

    await test.step('로그인과 내 글을 확인한다', async () => {
      await verify('새로 만든 회원으로 로그인해 있다', (await 세션아이디(page.request)) !== '', true, { blocker: true });
      await verify('지워도 되는 내 글이 있다', 글번호 > 0, true, { blocker: true });
    });

    await test.step('내 글 상세에서 「삭제」를 누른다', async () => {
      await 안내창끄기(page);
      await 상세.열기(글번호);
      await 상세.삭제버튼.click();
      await 확인창.열림기다리기();
      const 안내 = await 확인창.창.innerText();
      await verify(
        '「삭제」를 누르면 모달 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」가 뜬다',
        안내.includes('게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.'),
        true,
      );
    });

    await test.step('모달의 「삭제」를 누른다', async () => {
      await 확인창.버튼('삭제').click();
      await 목록.토스트.기다리기('삭제되었습니다');
      await verify(
        '글이 지워지고 게시판 목록으로 가 토스트 「삭제되었습니다」가 보인다',
        {
          경로: await 상세.경로읽기(),
          토스트: await 목록.토스트.문구('삭제되었습니다').first().isVisible(),
          글상태: (await page.request.get(`/api/posts/${글번호}`)).status(),
        },
        { 경로: '/board', 토스트: true, 글상태: 404 },
      );
    });
  } finally {
    await 정리.비우기();
  }
});
