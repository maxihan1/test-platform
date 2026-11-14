import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 인용글쓰기화면 } from './pages/quote-compose.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-294',
  name: '글쓰기 인용 카드의 제거 버튼(접근성 설명 「인용 취소」)을 누르면 인용 카드가 떨어진다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 인용 = new 인용글쓰기화면(driver);
  let 열림 = false;

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('홈 첫 글의 부스트 시트에서 인용 글쓰기를 연다', async () => {
      await 인용.홈첫글인용하기();
      열림 = true;
      await verify('글쓰기에 인용 카드가 붙어 있다', await 인용.떴나(), true, { blocker: true });
    });

    await test.step('인용 글쓰기에서 「인용 취소」를 누른다', async () => {
      await 인용.인용취소누르기();
      await verify('글쓰기 인용 카드의 제거 버튼(접근성 설명 「인용 취소」)을 누르면 인용 카드가 떨어진다', await 인용.인용글사라졌나(), true);
    }, { capture: true });
  } finally {
    if (열림) await 인용.닫기();
  }
});
