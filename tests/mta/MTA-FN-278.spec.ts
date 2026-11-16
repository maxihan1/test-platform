import { defineCase, test, verify, 폰에파일넣기 } from '@platform/kit';
import { z } from 'zod';

import { 사진붙이고기다리기 } from './helpers/attach-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 대체텍스트화면 } from './pages/alt-text.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-278',
  name: '대체 텍스트 화면에서 미리보기를 누르면 사진이 확대된다',
  platforms: ['android'],
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
  const 대체 = new 대체텍스트화면(driver);
  const 사진 = await 폰에파일넣기(driver, '사진');

  try {
    await test.step('일반 회원으로 로그인해 대체 텍스트 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
      await verify('첨부 조각이 한 개 보인다', await 사진붙이고기다리기(driver, 글쓰기, 사진.이름, 1), true, { blocker: true });
      await 글쓰기.대체텍스트열기();
      await verify('대체 텍스트 화면의 입력 칸이 보인다', await 대체.그려질때까지(), true, { blocker: true });
    });

    await test.step('대체 텍스트 화면 미리보기를 누른다', async () => {
      await 대체.미리보기누르기();
      await verify('대체 텍스트 화면에서 미리보기를 누르면 사진이 확대된다', await 대체.확대됐나(), true);
    });
  } finally {
    await 사진.지우기();
  }
});
