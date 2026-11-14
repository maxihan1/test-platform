import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { 문구가보이나, 프로필열기 } from './helpers/app.helper.js';
import { 누르기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-592',
  name: '팔로잉이 0명인 사람 글에 「답장」을 누르면 「안녕하세요, 새로운 연결!」 시트가 뜨지 않는다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  held: '보류 — 팔로잉 수가 정해진 계정의 글',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    팔로잉0명계정: z.string().describe('팔로잉이 0명이고 나를 팔로우하지 않는 계정 이름'),
    팔로잉1명계정: z.string().describe('팔로잉이 1명이고 나를 팔로우하지 않는 계정 이름'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('팔로잉이 0명이고 나를 팔로우하지 않는 사람 글에 「답장」을 누른다', async () => {
      await 프로필열기(driver, params.팔로잉0명계정);
      await 누르기(driver, 카드.답장들);
      await verify('팔로잉이 0명인 사람 글에 「답장」을 누르면 「안녕하세요, 새로운 연결!」 시트가 뜨지 않는다', !(await 문구가보이나(driver, '안녕하세요, 새로운 연결!', 4_000)), true);
    });
    await 탭줄로돌아오기(driver);
    await test.step('팔로잉이 1명이고 나를 팔로우하지 않는 사람 글에 「답장」을 누른다', async () => {
      await 프로필열기(driver, params.팔로잉1명계정);
      await 누르기(driver, 카드.답장들);
      await verify('팔로잉이 1명인 사람 글에서는 「안녕하세요, 새로운 연결!」 시트가 먼저 뜬다', await 문구가보이나(driver, '안녕하세요, 새로운 연결!'), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
