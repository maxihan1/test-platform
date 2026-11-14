import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-497',
  name: '내 목록이 없으면 「목록」 하위에 「목록으로 홈 피드를 관리하세요」 / 「여기에 당신의 제목이 나타납니다」가 보인다',
  platforms: ['android'],
  held: '보류 — 목록이 하나도 없는 계정',
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
  await test.step('목록이 없는 계정으로 홈 드롭다운 「목록」을 누른다', async () => {
    await 홈.드롭다운열기();
    await verify('「목록」 하위 목록이 열린다', await 홈.드롭다운하위열기('목록'), true, { blocker: true });
    const 제목 = await verify('「목록으로 홈 피드를 관리하세요」가 보인다', await 문구가보이나(driver, '목록으로 홈 피드를 관리하세요'), true);
    const 안내 = await verify('「여기에 당신의 제목이 나타납니다」가 보인다', await 문구가보이나(driver, '여기에 당신의 제목이 나타납니다'), true);
    await verify('내 목록이 없으면 「목록」 하위에 「목록으로 홈 피드를 관리하세요」 / 「여기에 당신의 제목이 나타납니다」가 보인다', 제목 && 안내, true);
  }, { capture: true });
});
