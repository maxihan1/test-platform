import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 글본문10자, 내글만들기, 세션아이디, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-151',
  name: '검색 조건 「제목」으로 검색하면 공지를 뺀 목록에 그 낱말이 제목에 든 내 글 한 건만 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '제목 · 본문 · 작성자 이름에 고유한 낱말이 든 내 글이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 목록 = new 게시판목록화면(page);
    const 제목낱말 = 고유이름('제목낱말');
    const 본문낱말 = 고유이름('본문낱말');
    let 이름 = '';

    await test.step('새로 만든 회원으로 로그인하고 고유한 낱말이 든 글을 만든다', async () => {
      이름 = (await 회원로그인(page.request, 정리)).name;
      await 내글만들기(page.request, 정리, { title: 제목낱말, content: `${글본문10자} ${본문낱말}` });
    });

    await test.step('로그인과 내 이름을 확인한다', async () => {
      await verify('새로 만든 회원으로 로그인해 있다', (await 세션아이디(page.request)) !== '', true, { blocker: true });
      await verify('작성자 이름이 고유하게 정해졌다', 이름.length >= 2, true, { blocker: true });
    });

    await test.step('검색 조건 「제목」으로 내 글 제목의 낱말을 검색한다', async () => {
      await 안내창끄기(page);
      await 목록.열기();
      await 목록.검색하고기다리기('제목', 제목낱말);
      await verify(
        '검색 조건 「제목」으로 검색하면 공지를 뺀 목록에 그 낱말이 제목에 든 내 글 한 건만 보인다',
        (await 목록.일반글읽기()).map((행) => 행.제목).join(', '),
        제목낱말,
      );
    });

    await test.step('검색 조건 「내용」으로 내 글 본문의 낱말을 검색한다', async () => {
      await 목록.검색하고기다리기('내용', 본문낱말);
      await verify(
        '검색 조건 「내용」으로 찾으면 본문에 그 낱말이 든 내 글 한 건만 보인다',
        (await 목록.일반글읽기()).map((행) => 행.제목).join(', '),
        제목낱말,
      );
    });

    await test.step('검색 조건 「작성자」로 내 이름을 검색한다', async () => {
      await 목록.검색하고기다리기('작성자', 이름);
      await verify(
        '검색 조건 「작성자」로 찾으면 작성자가 나인 글 한 건만 보인다',
        (await 목록.일반글읽기()).map((행) => `${행.작성자} ${행.제목}`).join(', '),
        `${이름} ${제목낱말}`,
      );
    });
  } finally {
    await 정리.비우기();
  }
});
