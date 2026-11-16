import { defineCase, test, verify, 폰에파일넣기 } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 내글모두지우기 } from './helpers/compose-flow.helper.js';
import { 사진붙이고기다리기 } from './helpers/attach-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈으로 } from './helpers/nav.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-266',
  name: '대체 텍스트 리마인더를 켜고 설명 없는 사진으로 「게시」를 누르면 「미디어에 대체 텍스트가 없습니다」 창이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    창글: z.string().describe('리마인더 창 글').default('미디어에 대체 텍스트가 없습니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 본문 = 표시글('대체 텍스트 리마인더 확인');
  const 사진 = await 폰에파일넣기(driver, '사진');

  try {
    await test.step('일반 회원으로 로그인해 설정 「동작」의 대체 텍스트 리마인더를 켠다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
      await verify('「동작」 설정이 열린다', await 설정줄열기(driver, '동작'), true, { blocker: true });
      await 설정.스위치바꾸기(0);
      await verify('대체 텍스트 리마인더 스위치가 켜진다', await 설정.켜졌나(0), true, { blocker: true });
    });

    await test.step('설명 없는 사진을 첨부한다', async () => {
      await 홈으로(driver);
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
      await verify('첨부 조각이 한 개 보인다', await 사진붙이고기다리기(driver, 글쓰기, 사진.이름, 1), true, { blocker: true });
      await 글쓰기.본문적기(본문);
    });

    await test.step('대체 텍스트 리마인더를 켜고 설명 없는 사진으로 「게시」를 누른다', async () => {
      await verify('「게시」가 켜진다', await 뜰때까지(driver, 글쓰기.게시켜짐, 30_000), true, { blocker: true });
      await driver.$(글쓰기.게시).click();
      await verify('대체 텍스트 리마인더를 켜고 설명 없는 사진으로 「게시」를 누르면 「미디어에 대체 텍스트가 없습니다」 창이 뜬다', await 뜰때까지(driver, 글쓰기.창.안의글자(expected.창글), 15_000), true);
    });
  } finally {
    await 내글모두지우기(driver, 본문);
    await 사진.지우기();
  }
});
