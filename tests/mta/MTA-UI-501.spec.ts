import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 프로필열기 } from './helpers/app.helper.js';
import { 글자요소가보이나, 글자요소누르기, 글자요소찾기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-501',
  name: '승인 대기 인용은 「게시 대기중」으로 보이고 누르면 설명 창과 「알겠습니다」가 뜬다',
  platforms: ['android'],
  held: '보류 — 승인 대기 상태의 인용 글',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    작성자: z.string().describe('승인 대기 인용 글을 쓴 계정 이름'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 확인 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('승인 대기 인용 글을 찾는다', async () => {
    await 프로필열기(driver, params.작성자);
    const 대기 = await verify('승인 대기 인용에 「게시 대기중」이 보인다', await 글자요소찾기(driver, '게시 대기중'), true);
    await 글자요소누르기(driver, '게시 대기중');
    const 설명창 = await verify('「게시 대기중」을 누른 뒤 설명 창이 뜬다', await 확인.떴나(), true);
    const 알겠습니다 = await verify('설명 창에 「알겠습니다」가 보인다', await 글자요소가보이나(driver, '알겠습니다'), true);
    await verify('승인 대기 인용은 「게시 대기중」으로 보이고 누르면 설명 창과 「알겠습니다」가 뜬다', 대기 && 설명창 && 알겠습니다, true);
  }, { capture: true });
});
