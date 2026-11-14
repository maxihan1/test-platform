import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록관리화면 } from './pages/list-manage.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-362',
  name: '목록 삭제는 「“<이름>” 삭제」 확인(「삭제」 · 「취소」)을 거친다',
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
  const 관리 = new 목록관리화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 목록 관리를 연다', async () => {
    await 관리.홈에서열기();
    await verify('목록 관리 화면에 「목록 만들기」 단추가 보인다', await 관리.떴나(), true, { blocker: true });
  });
  await test.step('목록 관리에서 「리스트 삭제」를 누른다', async () => {
    const 열림 = await 관리.삭제창열기('친구');
    await verify('삭제 확인 창이 뜬다', 열림, true);
    const 제목 = await verify('확인 창에 「“<이름>” 삭제」가 보인다', await 관리.글보이나('“<이름>” 삭제'), true);
    const 삭제 = await verify('확인 창 단추 「삭제」가 보인다', await 관리.삭제단추글(), '삭제');
    const 취소 = await verify('확인 창 단추 「취소」가 보인다', await 관리.취소단추글(), '취소');
    await verify('목록 삭제는 「“<이름>” 삭제」 확인(「삭제」 · 「취소」)을 거친다', 제목 && 삭제 && 취소, true);
    await 관리.확인.취소누르기();
  }, { capture: true });
});
