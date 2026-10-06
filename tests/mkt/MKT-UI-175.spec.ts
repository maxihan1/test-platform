import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-175',
  name: '글쓰기 화면 제목 칸에 「0/50」 · 본문 칸에 「0/2000」 글자 수가 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  unconfirmed: '기획서와 다름 — 차이 D9 · D10: 글쓰기 글자 수 표시와 「취소」 링크가 기획서에 없다 (작성 요청 5873)',
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 쓰기 = new 글쓰기화면(page);

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(page.request, 정리);
    });

    await test.step('글쓰기 화면을 연다', async () => {
      await 안내창끄기(page);
      await 쓰기.열기();
      await verify('글쓰기 화면이 열린다', await 쓰기.제목글.isVisible(), true, { blocker: true });
      await verify(
        '글쓰기 화면 제목 칸에 「0/50」 · 본문 칸에 「0/2000」 글자 수가 보인다',
        [(await 쓰기.제목글자수.innerText()).trim(), (await 쓰기.본문글자수.innerText()).trim()],
        ['0/50', '0/2000'],
      );
      await verify('글쓰기 화면 아래에 「취소」 링크가 보인다', await 쓰기.취소링크.isVisible(), true);
    });
  } finally {
    await 정리.비우기();
  }
});
