import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내글만들기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-055',
  name: '게시판 목록에서 오늘 쓴 글의 작성일은 「14:05」처럼 시각만 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '오늘 쓴 내 글이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 목록 = new 게시판목록화면(page);
    let 글제목 = '';

    await test.step('새로 만든 회원으로 로그인하고 오늘 쓴 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      글제목 = (await 내글만들기(page.request, 정리)).title;
    });

    await test.step('게시판 목록을 연다', async () => {
      await 안내창끄기(page);
      await 목록.열기();
      await verify('내 글이 게시판 목록에 보인다', await 목록.행(글제목).isVisible(), true, { blocker: true });
      const 내글 = (await 목록.행읽기()).find((행) => 행.제목 === 글제목);
      await verify('게시판 목록에서 오늘 쓴 글의 작성일은 「14:05」처럼 시각만 보인다', /^\d{2}:\d{2}$/.test(내글?.작성일 ?? ''), true);
      const 공지들 = (await 목록.행읽기()).filter((행) => 행.공지);
      const 날짜만 = 공지들.length > 0 && 공지들.every((행) => /^\d{4}-\d{2}-\d{2}$/.test(행.작성일));
      await verify('오늘 전에 쓴 공지글의 작성일은 「2026-09-20」처럼 날짜만 보인다', 날짜만, true);
    });
  } finally {
    await 정리.비우기();
  }
});
