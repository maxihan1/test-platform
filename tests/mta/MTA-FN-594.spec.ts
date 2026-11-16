import { defineCase, test, verify, 폰에파일넣기 } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/compose-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 파일선택기로첨부 } from './helpers/media.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-594',
  name: '지원하지 않는 텍스트 파일을 첨부하면 토스트 「파일은 지원되지 않는 타입입니다」가 보인다',
  platforms: ['android'],
  held: '보류 — 파일 선택기 「최근」에 텍스트 파일이 안 보이고 다른 폴더로 가는 주소를 못 읽었다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    토스트: z.string().describe('지원하지 않는 타입 토스트 글').default('파일은 지원되지 않는 타입입니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 파일 = await 폰에파일넣기(driver, '파일');

  try {
    await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    });

    await test.step('파일 선택기에서 지원하지 않는 텍스트 파일을 고른다', async () => {
      await verify('파일 선택기에서 텍스트 파일을 골라 선택기가 닫힌다', await 파일선택기로첨부(driver, 파일.이름), true, { blocker: true });
      await verify('지원하지 않는 텍스트 파일을 첨부하면 토스트 「파일은 지원되지 않는 타입입니다」가 보인다', await 문구가보이나(driver, expected.토스트, 10_000), true);
    });
  } finally {
    await 파일.지우기();
  }
});
