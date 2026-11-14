import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-110',
  name: '홈 드롭다운 「팔로우 중인 해시태그」 하위에 해시태그 목록과 「해시태그 관리」가 보인다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈 드롭다운에서 「팔로우 중인 해시태그」를 누른다', async () => {
    await 홈.드롭다운열기();
    await verify('「팔로우 중인 해시태그」 하위 목록이 열린다', await 홈.드롭다운하위열기('팔로우 중인 해시태그'), true, { blocker: true });
    const 글 = await 홈.드롭다운글자들();
    const 태그 = await verify('해시태그가 한 개 이상 보인다', 글.filter((줄) => 줄.startsWith('#')).length > 0, true);
    const 관리 = await verify('「해시태그 관리」가 보인다', 글.includes('해시태그 관리'), true);
    await verify('홈 드롭다운 「팔로우 중인 해시태그」 하위에 해시태그 목록과 「해시태그 관리」가 보인다', 태그 && 관리, true);
  }, { capture: true });
});
