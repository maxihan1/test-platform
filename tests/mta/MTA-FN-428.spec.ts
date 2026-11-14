import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-428',
  name: '구성원 목록(「리스트 구성원」)에서 선택 모드(「선택」 · 「n개 선택됨」 · 「전체 선택」) 후 「제거」하면 「구성원을 제거하시겠습니까?」를 묻는다',
  platforms: ['android'],
  held: '보류 — 목록 구성원 선택 모드의 요소 주소',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('새 목록 구성원을 선택해 「제거」를 누른다', async () => {
    await verify('구성원 목록(「리스트 구성원」)에서 선택 모드(「선택」 · 「n개 선택됨」 · 「전체 선택」) 후 「제거」하면 「구성원을 제거하시겠습니까?」를 묻는다', await 문구가보이나(driver, '리스트 구성원'), true);
  });
});
