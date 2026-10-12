import { defineCase, test, verify } from '@platform/kit';

import { 표식 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글자채우기, 내글제목들, 로그인해있나, 본문글, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-131',
  name: '제목 1자로 「등록」을 누르면 글이 등록되지 않는다',
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  const 토큰 = 표식('제목경계');
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
      await verify('회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
      await verify('글쓰기 화면이 열려 있다', await 쓰기.제목.isVisible(), true, { blocker: true });
    });

    await test.step('제목 1자 · 본문 10자로 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 분류: '자유', 제목: '가', 본문: 본문글(10) });
      await 쓰기.등록하고응답받기();
      await verify('제목 1자로 「등록」을 누르면 글이 등록되지 않는다', (await 내글제목들(나)).length, 0);
    });

    await test.step('제목 2자 · 본문 10자로 「등록」을 누른다', async () => {
      const 제목 = '가나';
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: 본문글(10) });
      await 쓰기.등록하고응답받기();
      await 상세.제목.waitFor();
      await verify('제목 2자로 「등록」을 누르면 글이 등록되어 상세로 간다', /^\/board\/\d+$/.test(new URL(page.url()).pathname) && (await 상세.제목.innerText()) === 제목, true);
    });

    await test.step('제목 50자 · 본문 10자로 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await 쓰기.준비될때까지();
      const 제목 = 글자채우기(토큰, 50);
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: 본문글(10) });
      await 쓰기.등록하고응답받기();
      await 상세.제목.waitFor();
      await verify('제목 50자로 「등록」을 누르면 글이 등록되어 상세로 간다', /^\/board\/\d+$/.test(new URL(page.url()).pathname) && (await 상세.제목.innerText()) === 제목, true);
    });

    await test.step('제목 칸에 51자를 넣고 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await 쓰기.준비될때까지();
      const 제목 = 글자채우기(토큰, 51);
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: 본문글(10) });
      await 쓰기.등록하고응답받기();
      await 상세.제목.waitFor();
      await verify('제목 51자를 넣고 「등록」을 누르면 제목이 50자로 등록된다', (await 상세.제목.innerText()) === 제목.slice(0, 50), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
