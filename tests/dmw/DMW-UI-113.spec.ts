import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-113',
  name: '내 댓글 「수정」을 누르면 그 자리가 입력칸으로 바뀌고 「저장」 · 「취소」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 댓글을 단 내 글의 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 댓글달기(page.request, 글번호, '고쳐 볼 내 댓글입니다');
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('내 댓글이 보인다', await 상세.댓글줄('고쳐 볼 내 댓글입니다').count(), 1, { blocker: true });
    });

    await test.step('내 댓글의 「수정」을 누른다', async () => {
      const 줄 = 상세.댓글줄('고쳐 볼 내 댓글입니다');
      await 상세.댓글수정버튼(줄).click();
      const 입력칸 = await verify('그 자리에 입력칸이 보인다', await 상세.수정칸(줄).isVisible(), true);
      const 저장 = await verify('「저장」이 보인다', await 상세.댓글저장버튼(줄).isVisible(), true);
      const 취소 = await verify('「취소」가 보인다', await 상세.댓글수정취소버튼(줄).isVisible(), true);
      await verify('내 댓글 「수정」을 누르면 그 자리가 입력칸으로 바뀌고 「저장」 · 「취소」가 보인다', 입력칸 && 저장 && 취소, true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
