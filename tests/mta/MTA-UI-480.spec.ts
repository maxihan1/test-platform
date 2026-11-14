import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창이면취소하기 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 컬렉션화면 } from './pages/collection.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-480',
  name: '컬렉션 화면에 제목 · 「by @<계정>」 · 계정 목록이 보이고 내가 포함되어 있으면 「You’re featured in this collection」 + 「Remove me」(확인 「Remove yourself from “<이름>”?」)가 보인다',
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
  const 컬렉션 = new 컬렉션화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('내 컬렉션 「좋아하는 사진가」를 연다', async () => {
    try {
      await 프로필.내프로필열기();
      await 프로필.탭누르기('추천');
      await 컬렉션.열기('좋아하는 사진가');
      const 판정1 = await verify('컬렉션 화면 제목 「좋아하는 사진가」가 보인다', await 컬렉션.글자보이나('좋아하는 사진가'), true);
      const 판정2 = await verify('컬렉션 화면에 「by @<계정>」이 보인다', await 컬렉션.글자보이나('by @<계정>'), true);
      const 판정3 = await verify('컬렉션 화면에 「You’re featured in this collection」가 보인다', await 컬렉션.글자보이나('You’re featured in this collection'), true);
      const 판정4 = await verify('컬렉션 화면에 「Remove me」가 보인다', await 컬렉션.글자보이나('Remove me'), true);
      await 컬렉션.글누르기('Remove me');
      const 판정5 = await verify('「Remove me」를 누르면 「Remove yourself from “<이름>”?」를 묻는다', await 컬렉션.글자보이나('Remove yourself from “<이름>”?'), true);
      await verify('컬렉션 화면에 제목 · 「by @<계정>」 · 계정 목록이 보이고 내가 포함되어 있으면 「You’re featured in this collection」 + 「Remove me」(확인 「Remove yourself from “<이름>”?」)가 보인다', 판정1 && 판정2 && 판정3 && 판정4 && 판정5, true);
    } finally {
      await 확인창이면취소하기(driver);
    }
  }, { capture: true });
});
