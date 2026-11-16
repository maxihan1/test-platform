import { defineCase, test, verify, 폰에파일넣기 } from '@platform/kit';
import { z } from 'zod';

import { 사진붙이고기다리기 } from './helpers/attach-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-177',
  name: '사진을 첨부하면 그 조각에 「대체 텍스트 추가」와 제거 버튼이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 사진 = await 폰에파일넣기(driver, '사진');

  try {
    await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    });

    await test.step('글쓰기에 사진 한 장을 첨부한다', async () => {
      await verify('첨부 조각이 한 개 보인다', await 사진붙이고기다리기(driver, 글쓰기, 사진.이름, 1), true, { blocker: true });
      const 대체 = await verify('「대체 텍스트 추가」가 보인다', await 글쓰기.조각글('title'), '대체 텍스트 추가');
      const 제거 = await verify('제거 버튼이 보인다', await 글쓰기.조각보이나('delete'), true);
      await verify('사진을 첨부하면 그 조각에 「대체 텍스트 추가」와 제거 버튼이 보인다', 대체 && 제거, true);
    });
  } finally {
    await 사진.지우기();
  }
});
