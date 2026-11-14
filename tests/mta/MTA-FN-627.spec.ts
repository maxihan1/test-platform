import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록만들기화면 } from './pages/list-create.page.js';
import { 목록관리화면 } from './pages/list-manage.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-627',
  name: '목록 이름이 비어 있으면 「비워둘 수 없습니다」가 보인다',
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
  const 만들기 = new 목록만들기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 목록 관리를 연다', async () => {
    await 관리.홈에서열기();
    await verify('목록 관리 화면에 「목록 만들기」 단추가 보인다', await 관리.떴나(), true, { blocker: true });
  });
  await test.step('목록 관리에서 목록 만들기 1단계를 연다', async () => {
    await 관리.만들기누르기();
    await verify('목록 만들기 1단계 화면이 보인다', await 만들기.떴나(), true, { blocker: true });
  });
  await test.step('목록 만들기 1단계에서 이름을 비우고 「만들기」를 누른다', async () => {
    await 만들기.만들기누르기();
    await verify('목록 이름이 비어 있으면 「비워둘 수 없습니다」가 보인다', await 만들기.안내보이나('비워둘 수 없습니다'), true);
  }, { capture: true });
});
