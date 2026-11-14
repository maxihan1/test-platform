import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-420',
  name: '자기소개는 입력이 한 번 바뀌면 저장이 켜진다',
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
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('프로필 편집에서 「Add bio」 줄을 연다', async () => {
    await 프로필.내프로필열기();
    await 편집.열기();
    await 편집.줄누르기('Add bio');
    await 편집.칸뜰때까지();
  });

  await test.step('자기소개 편집 칸에 글자 하나를 적는다', async () => {
    try {
      const 처음켜짐 = await 편집.저장켜짐();
      await 편집.칸적기('a');
      const 판정1 = await verify('자기소개를 적기 전에는 저장이 꺼져 있다', 처음켜짐, 'false');
      const 판정2 = await verify('글자 하나를 적은 뒤 저장이 켜진다', await 편집.저장켜짐(), 'true');
      await verify('자기소개는 입력이 한 번 바뀌면 저장이 켜진다', 판정1 && 판정2, true);
    } finally {
      await 편집.나가기();
    }
  }, { capture: true });
});
