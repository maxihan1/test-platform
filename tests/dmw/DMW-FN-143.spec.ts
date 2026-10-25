import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-143',
  name: '댓글에 공백만 적고 등록하면 토스트 「댓글 내용을 입력하세요」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할', '결정 테이블'],
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 내 글의 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('댓글이 하나도 없다', await 상세.댓글수읽기(), 0, { blocker: true });
    });

    await test.step('댓글 칸에 공백만 적고 「등록」을 누른다', async () => {
      await 상세.댓글쓰기('   ');
      await verify('댓글에 공백만 적고 등록하면 토스트 「댓글 내용을 입력하세요」가 보인다', await 알림.글('댓글 내용을 입력하세요').isVisible(), true);
    });

    await test.step('공백만 등록한 뒤 댓글 수를 확인한다', async () => {
      await verify('댓글에 공백만 적고 등록하면 댓글 수가 늘지 않는다', await 상세.댓글수읽기(), 0);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
