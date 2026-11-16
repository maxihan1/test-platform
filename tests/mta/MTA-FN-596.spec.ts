import { defineCase, test, verify, 폰에파일넣기 } from '@platform/kit';
import { z } from 'zod';

import { 내글모두지우기 } from './helpers/compose-flow.helper.js';
import { 긴글, 대체텍스트적고돌아오기, 게시하고결과보기, 사진붙이고기다리기 } from './helpers/attach-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-596',
  name: '대체 텍스트 10000자로 게시하면 「게시물 작성 실패」 창이 뜨지 않는다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    한도안글자수: z.number().int().min(1).describe('대체 텍스트에 먼저 적을 글자 수 — 10000자').default(10000),
    한도넘는글자수: z.number().int().min(2).describe('대체 텍스트에 다음으로 적을 글자 수 — 한도보다 하나 많게').default(10001),
  }),
  expected: z.object({
    실패창제목: z.string().describe('게시 실패 창 제목').default('게시물 작성 실패'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 본문 = 표시글('대체 텍스트 한도 확인');
  const 사진 = await 폰에파일넣기(driver, '사진');

  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });

    await test.step('대체 텍스트 10000자로 게시한다', async () => {
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
      await verify('첨부 조각이 한 개 보인다', await 사진붙이고기다리기(driver, 글쓰기, 사진.이름, 1), true, { blocker: true });
      await verify('대체 텍스트를 적고 글쓰기 화면으로 돌아온다', await 대체텍스트적고돌아오기(driver, 글쓰기, 긴글(params.한도안글자수)), true, { blocker: true });
      await 글쓰기.본문적기(본문);
      const 결과 = await 게시하고결과보기(driver, 글쓰기, expected.실패창제목);
      await verify('대체 텍스트 10000자로 게시하면 「게시물 작성 실패」 창이 뜨지 않는다', 결과 === '실패', false);
      if (결과 === '실패') {
        await driver.$(글쓰기.실패창취소).click();
        await 글쓰기.나가기();
      }
    });

    await test.step('대체 텍스트 10001자로 게시한다', async () => {
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
      await verify('첨부 조각이 한 개 보인다', await 사진붙이고기다리기(driver, 글쓰기, 사진.이름, 1), true, { blocker: true });
      await verify('대체 텍스트를 적고 글쓰기 화면으로 돌아온다', await 대체텍스트적고돌아오기(driver, 글쓰기, 긴글(params.한도넘는글자수)), true, { blocker: true });
      await 글쓰기.본문적기(본문);
      await 게시하고결과보기(driver, 글쓰기, expected.실패창제목);
      await verify('오류 안내가 보인다', await 글쓰기.창.뜰때까지(), true);
      await driver.$(글쓰기.실패창취소).click();
      await 글쓰기.나가기();
    });
  } finally {
    await 내글모두지우기(driver, 본문);
    await 사진.지우기();
  }
});
