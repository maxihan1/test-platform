import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 표식 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 로그인해있나, 본문글, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-143',
  name: '임시 저장 뒤 글을 등록하면 글쓰기를 다시 열어도 불러오기 확인 창이 뜨지 않는다',
  precondition: ['회원으로 로그인해 글쓰기 화면을 열어 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 상세 = new 게시글상세화면(page);
  const 알림 = new 토스트(page);
  const 정리 = 정리함만들기();
  const 열린확인창: string[] = [];
  let 나!: 글쓴이;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      await 쓰기.열기();
    });

    await test.step('글쓰기 화면이 열렸는지 확인한다', async () => {
      await 쓰기.준비될때까지();
      await verify('회원으로 로그인해 글쓰기 화면을 열어 두었다', (await 로그인해있나(page.request)) && (await 쓰기.제목.isVisible()), true, { blocker: true });
    });

    await test.step('임시 저장한 뒤 글을 등록하고 글쓰기 화면을 다시 연다', async () => {
      page.on('dialog', (창) => {
        if (창.type() === 'confirm') 열린확인창.push(창.message());
        void 창.dismiss();
      });
      await 쓰기.채우기({ 분류: '자유', 제목: 표식('임시저장'), 본문: 본문글(20) });
      await 쓰기.임시저장.click();
      await 알림.글('임시 저장되었습니다').first().waitFor();
      await 쓰기.등록하고응답받기();
      await 상세.제목.waitFor();
      await 쓰기.열기();
      await 쓰기.준비될때까지();
      await verify('임시 저장 뒤 글을 등록하면 글쓰기를 다시 열어도 불러오기 확인 창이 뜨지 않는다', 열린확인창.length, 0);
    });
  } finally {
    await 정리.모두하기();
  }
});
