import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-108',
  name: '홈 드롭다운 「목록」 하위에 내 목록(가나다 순) · 「목록 만들기」 · 「목록 관리」가 보인다',
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
  await test.step('홈 드롭다운에서 「목록」을 누른다', async () => {
    await 홈.드롭다운열기();
    await verify('「목록」 하위 목록이 열린다', await 홈.드롭다운하위열기('목록'), true, { blocker: true });
    const 글 = await 홈.드롭다운글자들();
    const 내목록 = 글.slice(글.indexOf('목록. 뒤로 가기') + 1, 글.indexOf('목록 만들기'));
    const 있음 = await verify('내 목록이 한 개 이상 보인다', 내목록.length > 0, true);
    const 순서 = await verify('내 목록이 가나다 순이다', 내목록.join(', '), [...내목록].sort((a, b) => a.localeCompare(b, 'ko')).join(', '));
    const 만들기 = await verify('「목록 만들기」가 보인다', 글.includes('목록 만들기'), true);
    const 관리 = await verify('「목록 관리」가 보인다', 글.includes('목록 관리'), true);
    await verify('홈 드롭다운 「목록」 하위에 내 목록(가나다 순) · 「목록 만들기」 · 「목록 관리」가 보인다', 있음 && 순서 && 만들기 && 관리, true);
  }, { capture: true });
});
