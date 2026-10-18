import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 글번호들정리, 기본본문, 이미지글만들기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-108',
  name: '게시글 상세에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문 · 첨부 이미지가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 이미지를 첨부한 글을 하나 썼다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 회원?: 회원정보; 글번호?: number } = {};
  const 제목 = 고유글자('이미지 글');

  try {
    await test.step('회원이 이미지를 첨부한 글을 쓴다', async () => {
      준비.회원 = await 새회원으로로그인(request);
      준비.글번호 = await 이미지글만들기(request, { title: 제목, content: 기본본문 });
    });

    await test.step('쓴 글이 만들어졌는지 확인한다', async () => {
      await verify('쓴 글이 이미지 한 장과 함께 만들어져 있다', 준비.글번호 !== undefined, true, { blocker: true });
    });

    await test.step('그 글의 상세를 연다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글번호 ?? 0);
      await verify('게시글 상세 제목이 방금 쓴 글 제목이다', await 글.제목.innerText(), 제목, { blocker: true });
      const 보임 = [await 글.제목.isVisible(), await 글.메타('분류').isVisible(), await 글.메타('작성자').isVisible(), await 글.메타('작성일').isVisible(), await 글.메타('조회수').isVisible(), await 글.본문(기본본문).isVisible(), await 글.이미지들.first().isVisible()];
      await verify('게시글 상세에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문 · 첨부 이미지가 보인다', 보임, [true, true, true, true, true, true, true]);
    });
  } finally {
    if (준비.회원) {
      await 글번호들정리(request, 준비.글번호 === undefined ? [] : [준비.글번호]);
      await 회원정리(request, 준비.회원);
    }
  }
});
