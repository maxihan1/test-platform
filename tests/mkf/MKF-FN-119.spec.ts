import { defineCase, test, verify } from '@platform/kit';

import { 표식 } from './helpers/board.helper.js';
import { 글자채우기, 글쓴이정리하기, 로그인해있나, 본문글, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-119',
  name: '제목 1자로 등록하면 글쓰기 화면에 머문다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
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
    await test.step('새로 가입한 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      await 쓰기.열기();
    });

    await test.step('글쓰기 화면이 열렸는지 확인한다', async () => {
      await 쓰기.준비될때까지();
      await verify('새로 가입한 회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
      await verify('글쓰기 화면이 열려 있다', await 쓰기.제목.isVisible(), true, { blocker: true });
    });

    await test.step('제목 1자 · 본문 10자로 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 분류: '자유', 제목: '가', 본문: 본문글(10) });
      await 쓰기.등록하고응답받기();
      await verify('제목 1자로 등록하면 글쓰기 화면에 머문다', 경로(page), 글쓰기화면.주소);
    });

    await test.step('제목 2자 · 본문 10자로 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 분류: '자유', 제목: '가나', 본문: 본문글(10) });
      await 쓰기.등록하고응답받기();
      await 상세.제목.waitFor();
      await verify('제목 2자로 등록하면 방금 쓴 글의 상세로 간다', /^\/board\/\d+$/.test(경로(page)) && (await 상세.제목.innerText()) === '가나', true);
    });

    await test.step('제목 50자 · 본문 10자로 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await 쓰기.준비될때까지();
      const 제목 = 글자채우기(토큰, 50);
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: 본문글(10) });
      await 쓰기.등록하고응답받기();
      await 상세.제목.waitFor();
      await verify('제목 50자로 등록하면 방금 쓴 글의 상세로 간다', /^\/board\/\d+$/.test(경로(page)) && (await 상세.제목.innerText()) === 제목, true);
    });

    await test.step('글쓰기 제목 칸에 51자를 적는다', async () => {
      await 쓰기.열기();
      await 쓰기.준비될때까지();
      await 쓰기.제목칸.fill(글자채우기(토큰, 51));
      await verify('글쓰기 제목 칸에 51자를 적으면 50자까지만 들어간다', (await 쓰기.제목칸.inputValue()).length, 50);
    });
  } finally {
    await 정리.모두하기();
  }
});
