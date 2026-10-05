import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-528',
  name: '「임시 저장」을 누르면 토스트 「임시 저장되었습니다」가 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  unconfirmed: '기획서와 다름 — 차이 D11: 임시 저장 토스트가 기획서에 없다 (작성 요청 5873)',
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 쓰기 = new 글쓰기화면(page);

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(page.request, 정리);
      await 안내창끄기(page);
      await 쓰기.확인창받기('accept');
    });

    await test.step('글쓰기 화면에서 제목을 적고 「임시 저장」을 누른다', async () => {
      await 쓰기.열기();
      await verify('글쓰기 화면이 열린다', await 쓰기.제목글.isVisible(), true, { blocker: true });
      await 쓰기.채우기({ 제목: 고유이름('임시글') });
      await 쓰기.임시저장버튼.click();
      const 토스트 = await 쓰기.토스트.기다리기('임시 저장되었습니다');
      await verify('「임시 저장」을 누르면 토스트 「임시 저장되었습니다」가 보인다', await 토스트.isVisible(), true);
    });
  } finally {
    await 정리.비우기();
  }
});
