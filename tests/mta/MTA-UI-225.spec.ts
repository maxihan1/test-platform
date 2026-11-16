import { defineCase, test, verify, 폰에파일넣기 } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 사진붙이고기다리기 } from './helpers/attach-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 대체텍스트화면 } from './pages/alt-text.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-225',
  name: '「대체 텍스트 추가」 화면에 미리보기 · 힌트 「대체 텍스트」 · 「대체 텍스트란 무엇인가요?」가 보인다',
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
  const 대체 = new 대체텍스트화면(driver);
  const 사진 = await 폰에파일넣기(driver, '사진');
  let 미리보기 = false;
  let 힌트 = false;

  try {
    await test.step('일반 회원으로 로그인해 사진 한 장을 첨부한다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
      await verify('첨부 조각이 한 개 보인다', await 사진붙이고기다리기(driver, 글쓰기, 사진.이름, 1), true, { blocker: true });
    });

    await test.step('사진 조각의 「대체 텍스트 추가」를 누른다', async () => {
      await 글쓰기.대체텍스트열기();
      await verify('「대체 텍스트 추가」 화면의 입력 칸이 보인다', await 대체.그려질때까지(), true, { blocker: true });
      미리보기 = await verify('미리보기가 보인다', await 뜰때까지(driver, 대체.미리보기, 10_000), true);
      힌트 = await verify('힌트 「대체 텍스트」가 보인다', await 대체.입력칸글(), '대체 텍스트');
    });

    await test.step('도움말 버튼을 누른다', async () => {
      await verify('도움말 창이 열린다', await 대체.도움말열기(), true, { blocker: true });
      const 안내 = await verify('「대체 텍스트란 무엇인가요?」가 보인다', await 대체.도움말제목글(), '대체 텍스트란 무엇인가요?');
      await verify('「대체 텍스트 추가」 화면에 미리보기 · 힌트 「대체 텍스트」 · 「대체 텍스트란 무엇인가요?」가 보인다', 미리보기 && 힌트 && 안내, true);
    });
  } finally {
    await 사진.지우기();
  }
});
