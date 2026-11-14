import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로 } from './helpers/app.helper.js';
import { 누르기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 부스트시트 } from './pages/boost-sheet.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-144',
  name: '글 카드 「부스트」를 누르면 하단 시트에 「부스트」 · 「인용하기」가 보이고, 이미 부스트했으면 「부스트 실행 취소」가 보인다',
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
  const 부스트창 = new 부스트시트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈 글 카드에서 「부스트」를 누른다', async () => {
    await 누르기(driver, 홈.부스트들);
    await verify('부스트 시트가 뜬다', await 부스트창.떴나(), true, { blocker: true });
    const 항목들 = await 부스트창.항목글자();
    const 부스트 = await verify('부스트 시트에 「부스트」가 보인다', 항목들.includes('부스트'), true);
    const 인용 = await verify('부스트 시트에 「인용하기」가 보인다', 항목들.includes('인용하기'), true);
    await verify('글 카드 「부스트」를 누르면 하단 시트에 「부스트」 · 「인용하기」가 보이고, 이미 부스트했으면 「부스트 실행 취소」가 보인다', 부스트 && 인용, true);
    await 뒤로(driver);
  }, { capture: true });
});
