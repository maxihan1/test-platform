import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-071',
  name: '글쓰기 화면에 분류 · 제목 · 본문 칸이 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
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
      const 보임 = (await 쓰기.분류.isVisible()) && (await 쓰기.제목.isVisible()) && (await 쓰기.본문.isVisible());
      await verify('글쓰기 화면에 분류 · 제목 · 본문 칸이 보인다', 보임, true);
      const 글자들 = await 쓰기.분류글자들읽기();
      await verify('분류 선택 상자에 「자유」 · 「질문」 · 「후기」가 있다', ['자유', '질문', '후기'].every((글자) => 글자들.includes(글자)), true);
    });
  } finally {
    await 정리.비우기();
  }
});
