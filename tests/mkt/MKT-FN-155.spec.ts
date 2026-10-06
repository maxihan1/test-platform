import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 내글만들기, 세션아이디, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-155',
  name: '맞는 글이 0건이면 표 대신 「검색 결과가 없습니다」가 보인다',
  precondition: ['비회원이다', '새로 만든 회원으로 로그인해 있다', '고유한 낱말이 제목에 든 내 글이 하나 있다'],
  techniques: ['경계값 분석'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 목록 = new 게시판목록화면(page);
    const 낱말 = 고유이름('고유낱말');

    await test.step('게시판 목록에서 맞는 글이 없는 검색어 「zzqqxx」로 검색한다', async () => {
      await 안내창끄기(page);
      await 목록.열기();
      await 목록.검색하고기다리기('제목', 'zzqqxx');
      await verify(
        '맞는 글이 0건이면 표 대신 「검색 결과가 없습니다」가 보인다',
        { 안내: await 목록.빈결과.isVisible(), 표: await 목록.표.count() },
        { 안내: true, 표: 0 },
      );
    });

    await test.step('새로 만든 회원으로 로그인하고 제목에 고유한 낱말이 든 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      await 내글만들기(page.request, 정리, { title: 낱말 });
    });

    await test.step('로그인을 확인한다', async () => {
      await verify('새로 만든 회원으로 로그인해 있다', (await 세션아이디(page.request)) !== '', true, { blocker: true });
    });

    await test.step('게시판 목록에서 그 낱말로 검색한다', async () => {
      await 목록.열기();
      await 목록.검색하고기다리기('제목', 낱말);
      await verify(
        '맞는 글이 1건이면 「검색 결과가 없습니다」 없이 표에 그 글이 보인다',
        { 안내: await 목록.빈결과.count(), 제목들: (await 목록.일반글읽기()).map((행) => 행.제목) },
        { 안내: 0, 제목들: [낱말] },
      );
    });
  } finally {
    await 정리.비우기();
  }
});
