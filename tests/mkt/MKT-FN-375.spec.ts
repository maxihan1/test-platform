import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 표식 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 로그인해있나, 본문글, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-375',
  name: '본문 9자로 「등록」을 누르면 토스트 「본문은 10~2000자입니다」가 보인다',
  precondition: ['회원으로 로그인해 글쓰기 화면을 열어 두었다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 상세 = new 게시글상세화면(page);
  const 알림 = new 토스트(page);
  const 정리 = 정리함만들기();
  const 토큰 = 표식('본문경계');
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

    await test.step('본문에 9자를 적고 다른 칸을 채워 「등록」을 누른다', async () => {
      const 제목 = 토큰;
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: 본문글(9) });
      await 쓰기.등록하고응답받기();
      await 알림.글('본문은 10~2000자입니다').first().waitFor({ timeout: 5000 });
      await verify('본문 9자로 「등록」을 누르면 토스트 「본문은 10~2000자입니다」가 보인다', await 알림.글('본문은 10~2000자입니다').first().isVisible(), true);
    });

    await test.step('본문에 10자를 적고 다른 칸을 채워 「등록」을 누른다', async () => {
      const 제목 = 토큰;
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: 본문글(10) });
      await 쓰기.등록하고응답받기();
      await 상세.제목.waitFor();
      await verify('본문 10자로 「등록」을 누르면 본문 오류 토스트가 보이지 않는다', await 알림.글('본문은 10~2000자입니다').count(), 0);
    });

    await test.step('본문에 2000자를 적고 다른 칸을 채워 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await 쓰기.준비될때까지();
      const 제목 = 토큰;
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: 본문글(2000) });
      await 쓰기.등록하고응답받기();
      await 상세.제목.waitFor();
      await verify('본문 2000자로 「등록」을 누르면 본문 오류 토스트가 보이지 않는다', await 알림.글('본문은 10~2000자입니다').count(), 0);
    });

    await test.step('본문에 2001자를 넣고 다른 칸을 채워 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await 쓰기.준비될때까지();
      const 제목 = 토큰;
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: 본문글(2001) });
      await 쓰기.등록하고응답받기();
      await verify('본문 칸에 2001자를 넣고 「등록」을 누르면 본문 오류 토스트가 보이지 않는다', await 알림.글('본문은 10~2000자입니다').count(), 0);
    });
  } finally {
    await 정리.모두하기();
  }
});
