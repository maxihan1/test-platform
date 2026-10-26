import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 고유낱말, 그림주소, 글올리기, 로그인상태인가, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import type { 글정보 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-092',
  name: '게시글 상세에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 만든글: number[] = [];
  let 글: 글정보 | undefined;

  try {
    await test.step('일회용 회원이 글과 이미지를 첨부한 글을 올려 둔다', async () => {
      글 = await 일회용회원의글만들기(request);
      만든글.push(글.번호);
      만든글.push(await 글올리기(request, { 제목: 고유낱말('그림글'), 본문: '이미지를 첨부한 글의 본문입니다 열 글자가 넘습니다', 이미지: [그림주소(3)] }));
      await 안내창막기(page);
      await 상세.열기(글.번호);
      await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
      await verify('올려 둔 글의 제목이 보인다', await 상세.제목.innerText(), 글.제목, { blocker: true });
    });

    await test.step('게시글 상세를 연다', async () => {
      const 제목 = await verify('제목이 보인다', await 상세.제목.isVisible(), true);
      const 분류 = await verify('분류가 보인다', await 상세.분류.isVisible(), true);
      const 작성자 = await verify('작성자가 보인다', await 상세.작성자.isVisible(), true);
      const 작성일 = await verify('작성일이 보인다', await 상세.작성일.isVisible(), true);
      const 조회수 = await verify('조회수가 보인다', await 상세.조회수.isVisible(), true);
      const 본문 = await verify('본문이 보인다', await 상세.본문.isVisible(), true);
      await verify('게시글 상세에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문이 보인다', 제목 && 분류 && 작성자 && 작성일 && 조회수 && 본문, true);
    });

    await test.step('일회용 회원으로 로그인해 이미지를 첨부한 내 글 상세를 연다', async () => {
      if (글 === undefined) throw new Error('올려 둔 글이 없다');
      await API로그인(page.request, 글.회원.loginId, 글.회원.password);
      await 상세.열기(만든글[1] as number);
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('이미지를 첨부한 내 글 상세를 연다', async () => {
      await verify('이미지를 첨부한 게시글 상세에 첨부 이미지가 보인다', await 상세.첨부이미지들.first().isVisible(), true);
    });
  } finally {
    for (const 번호 of 만든글) await 글지우기(request, 번호);
  }
});
