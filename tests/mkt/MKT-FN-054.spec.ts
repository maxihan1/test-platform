import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-054',
  name: '게시글 「삭제」 를 누르면 모달 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」 가 뜬다',
  platforms: ['desktop'],
  precondition: ['회원이 직접 쓴 글이 하나 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 창 = new 모달(page);
  const 알림 = new 토스트(page);
  const 제목 = 고유제목(spec.tcId, '삭제');
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 글을 하나 만든다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 제목 });
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('내 글 상세에서 「삭제」 를 누른다', async () => {
      await 상세.열기(글번호);
      await verify('내 글 상세에 「삭제」 버튼이 보인다', await 상세.삭제버튼.isVisible(), true, { blocker: true });
      await 상세.삭제버튼.click();
      await 창.창.waitFor();
      await verify(
        '게시글 「삭제」 를 누르면 모달 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」 가 뜬다',
        (await 창.본문.innerText()).trim(),
        '게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.',
      );
    });

    await test.step('삭제 모달에서 「삭제」 를 누른다', async () => {
      await 창.버튼('삭제').click();
      await 알림.모두.first().waitFor();
      await verify(
        '삭제 모달에서 「삭제」 를 누르면 게시판 목록으로 가서 토스트 「삭제되었습니다」 가 보인다',
        { 주소: new URL(page.url()).pathname, 토스트: await 알림.모두.allInnerTexts() },
        { 주소: '/board', 토스트: ['삭제되었습니다'] },
      );
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
