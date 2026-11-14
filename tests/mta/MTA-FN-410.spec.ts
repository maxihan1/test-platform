import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-410',
  name: '프로필 항목 편집(「Add field」 / 「Edit field」)은 「라벨」 · 「내용」 입력(예시 「E.g. ‘Personal website’」 · 「E.g. “example.me”」)이고 둘 중 하나가 있으면 저장할 수 있다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    항목라벨: z.string().describe('프로필 항목 라벨에 적을 글자 — 1자 이상 255자 이하').default('tc_label'),
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

  await test.step('프로필 편집에서 「Add field」 편집 창을 연다', async () => {
    await 프로필.내프로필열기();
    await 편집.열기();
    await 편집.줄누르기('Custom fields');
    await 편집.줄누르기('Add field');
    await 편집.칸뜰때까지();
  });

  await test.step('프로필 항목 편집에서 「라벨」만 적는다', async () => {
    try {
      await 편집.칸적기(params.항목라벨);
      const 판정1 = await verify('라벨 입력 예시 「E.g. ‘Personal website’」가 보인다', await 문구가보이나(driver, 'E.g. ‘Personal website’'), true);
      const 판정2 = await verify('내용 입력 예시 「E.g. “example.me”」가 보인다', await 문구가보이나(driver, 'E.g. “example.me”'), true);
      const 판정3 = await verify('라벨만 적어도 「저장」이 켜진다', await 편집.저장켜짐(), 'true');
      await verify('프로필 항목 편집(「Add field」 / 「Edit field」)은 「라벨」 · 「내용」 입력(예시 「E.g. ‘Personal website’」 · 「E.g. “example.me”」)이고 둘 중 하나가 있으면 저장할 수 있다', 판정1 && 판정2 && 판정3, true);
    } finally {
      await 편집.나가기();
    }
  }, { capture: true });
});
