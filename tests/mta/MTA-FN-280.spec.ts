import { defineCase, test, verify, 폰에파일넣기 } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 내글모두지우기, 화면글정확 } from './helpers/compose-flow.helper.js';
import { 대체텍스트적고돌아오기, 사진붙이고기다리기 } from './helpers/attach-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 내프로필에서글열기, 표시글 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-280',
  name: '대체 텍스트를 적고 글쓰기로 돌아와 게시하면 그 글 사진에 「ALT」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    대체글: z.string().min(1).describe('사진에 적을 대체 텍스트').default('대체 텍스트 확인용 설명'),
  }),
  expected: z.object({
    표지: z.string().describe('대체 텍스트가 있는 사진에 보이는 표지 글자').default('ALT'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 본문 = 표시글('대체 텍스트 확인');
  const 사진 = await 폰에파일넣기(driver, '사진');

  try {
    await test.step('일반 회원으로 로그인해 사진 한 장을 첨부한다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
      await verify('첨부 조각이 한 개 보인다', await 사진붙이고기다리기(driver, 글쓰기, 사진.이름, 1), true, { blocker: true });
    });

    await test.step('대체 텍스트를 적고 돌아와 게시한다', async () => {
      await verify('대체 텍스트를 적고 글쓰기 화면으로 돌아온다', await 대체텍스트적고돌아오기(driver, 글쓰기, params.대체글), true, { blocker: true });
      await 글쓰기.본문적기(본문);
      await verify('「게시」가 켜진다', await 뜰때까지(driver, 글쓰기.게시켜짐, 30_000), true, { blocker: true });
      await driver.$(글쓰기.게시).click();
      await verify('게시가 끝나 홈 화면이 보인다', await 뜰때까지(driver, 글쓰기.글쓰기버튼, 40_000), true, { blocker: true });
      await 내프로필에서글열기(driver, 본문);
      await verify('대체 텍스트를 적고 글쓰기로 돌아와 게시하면 그 글 사진에 「ALT」가 보인다', await 뜰때까지(driver, 화면글정확(expected.표지), 15_000), true);
    });
  } finally {
    await 내글모두지우기(driver, 본문);
    await 사진.지우기();
  }
});
