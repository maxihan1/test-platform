import { defineCase, test, verify, 폰에파일넣기 } from '@platform/kit';
import { z } from 'zod';

import { 내글모두지우기 } from './helpers/compose-flow.helper.js';
import { 긴글, 대체텍스트적고돌아오기, 게시하고결과보기, 사진붙이고기다리기 } from './helpers/attach-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-597',
  name: '대체 텍스트가 서버 한도를 넘는 글을 게시하면 「게시물 작성 실패」 창이 뜬다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  techniques: ['동등 분할'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글자수: z.number().int().min(1).describe('대체 텍스트에 적을 글자 수 — 서버 한도 10000자를 넘게').default(10001),
  }),
  expected: z.object({
    실패창제목: z.string().describe('게시 실패 창 제목').default('게시물 작성 실패'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 본문 = 표시글('대체 텍스트 초과 확인');
  const 사진 = await 폰에파일넣기(driver, '사진');

  try {
    await test.step('일반 회원으로 로그인해 사진 한 장을 첨부한다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
      await verify('첨부 조각이 한 개 보인다', await 사진붙이고기다리기(driver, 글쓰기, 사진.이름, 1), true, { blocker: true });
      await verify('대체 텍스트를 적고 글쓰기 화면으로 돌아온다', await 대체텍스트적고돌아오기(driver, 글쓰기, 긴글(params.글자수)), true, { blocker: true });
    });

    await test.step('대체 텍스트 10001자로 「게시」를 누른다', async () => {
      await 글쓰기.본문적기(본문);
      const 결과 = await 게시하고결과보기(driver, 글쓰기, expected.실패창제목);
      await verify('대체 텍스트가 서버 한도를 넘는 글을 게시하면 「게시물 작성 실패」 창이 뜬다', 결과 === '실패', true);
      await driver.$(글쓰기.실패창취소).click();
      await 글쓰기.나가기();
    });
  } finally {
    await 내글모두지우기(driver, 본문);
    await 사진.지우기();
  }
});
