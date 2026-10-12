import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-145',
  name: '글쓰기 분류 드롭다운에 「자유」 · 「질문」 · 「후기」가 있다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;

  try {
    await test.step('회원으로 로그인한다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('글쓰기 화면을 연다', async () => {
      await 방해막기(page);
      await 쓰기.열기();
      await 쓰기.준비될때까지();
      const 항목들 = (await 쓰기.분류항목들()).filter((글) => 글 !== '분류를 선택하세요');
      await verify('글쓰기 분류 드롭다운에 「자유」 · 「질문」 · 「후기」가 있다', 항목들.join(' · '), '자유 · 질문 · 후기');
    });
  } finally {
    await 정리.모두하기();
  }
});
