import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 댓글달기, 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-106',
  name: '댓글이 없는 글의 제목 옆에는 댓글 수가 붙지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;
  let 제목 = '';

  try {
    await test.step('일회용 회원으로 글을 하나 올려 둔다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      제목 = 글.제목;
      await 안내창막기(page);
      await 목록.열기({ 검색어: 글.제목 });
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('올려 둔 글이 게시판 목록에 보인다', await 목록.제목링크(글.제목).count(), 1, { blocker: true });
    });

    await test.step('댓글이 없는 내 글을 목록에서 찾는다', async () => {
      const 행 = (await 목록.일반행들()).find((하나) => 하나.제목 === 제목);
      await verify('댓글이 없는 글의 제목 옆에는 댓글 수가 붙지 않는다', 행?.댓글표시, '');
    });

    await test.step('내 글에 댓글 하나를 단 뒤 목록에서 찾는다', async () => {
      await 댓글달기(page.request, 글번호, '댓글 하나를 달았습니다');
      await 목록.열기({ 검색어: 제목 });
      const 행 = (await 목록.일반행들()).find((하나) => 하나.제목 === 제목);
      await verify('댓글이 하나인 글의 제목 옆에 「[1]」이 붙는다', 행?.댓글표시, '[1]');
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
