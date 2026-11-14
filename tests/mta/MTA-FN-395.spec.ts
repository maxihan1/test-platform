import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-395',
  name: '내 프로필 상단 메뉴를 열면 내 프로필 상단 메뉴에는 「Mute account」 · 「Block account」 · 「Report account」가 보이지 않는다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('내 프로필 상단 메뉴를 연다', async () => {
    await 프로필.내프로필열기();
    const 항목 = await 프로필.메뉴항목들();
    const 판정1 = await verify('내 프로필 상단 메뉴에 「Mute account」가 보이지 않는다', 항목.includes('Mute account'), false);
    const 판정2 = await verify('내 프로필 상단 메뉴에 「Block account」가 보이지 않는다', 항목.includes('Block account'), false);
    const 판정3 = await verify('내 프로필 상단 메뉴에 「Report account」가 보이지 않는다', 항목.includes('Report account'), false);
    await verify('내 프로필 상단 메뉴를 열면 내 프로필 상단 메뉴에는 「Mute account」 · 「Block account」 · 「Report account」가 보이지 않는다', 판정1 && 판정2 && 판정3, true);
  }, { capture: true });
});
