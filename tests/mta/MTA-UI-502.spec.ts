import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 문구가보이나, 프로필열기 } from './helpers/app.helper.js';
import { 부스트시트에서문구찾기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-502',
  name: '인용 승인제 글의 부스트 시트에는 「인용 요청」 / 「작성자가 수동으로 검토할 것입니다.」가 보인다',
  platforms: ['android'],
  held: '보류 — 인용 승인제 글',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    작성자: z.string().describe('인용 승인제 글을 쓴 계정 이름'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('인용 승인제 글에서 「부스트」를 누른다', async () => {
    await 프로필열기(driver, params.작성자);
    const 안내 = await verify('인용 승인제 글의 부스트 시트에 「작성자가 수동으로 검토할 것입니다.」가 보인다', await 부스트시트에서문구찾기(driver, ['작성자가 수동으로 검토할 것입니다.']), true);
    const 요청 = await verify('인용 승인제 글의 부스트 시트에 「인용 요청」이 보인다', await 문구가보이나(driver, '인용 요청'), true);
    await verify('인용 승인제 글의 부스트 시트에는 「인용 요청」 / 「작성자가 수동으로 검토할 것입니다.」가 보인다', 안내 && 요청, true);
    await 뒤로(driver);
  }, { capture: true });
});
