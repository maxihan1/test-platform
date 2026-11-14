import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 홈으로돌아가기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트시트 } from './pages/mute-sheet.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-628',
  name: '뮤트 · 차단에 성공하면 그 계정의 글이 현재 목록에서 바로 빠진다',
  platforms: ['android'],
  held: '보류 — 홈에 글이 있으면서 뮤트해도 되는 계정',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    뮤트할계정: z.string().describe('홈에 글이 있는 계정의 사용자명'),
    계정글본문: z.string().describe('그 계정이 홈에 올린 글의 본문 일부'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 시트 = new 뮤트시트(driver);
  const 상세 = new 글상세화면(driver);
  let 중 = false;

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('홈에서 그 계정의 글을 찾는다', async () => {
      await verify('홈에 그 계정의 글이 보인다', await 상세.본문있나(params.계정글본문), true, { blocker: true });
    });

    await test.step('홈에 글이 있는 사람을 뮤트한다', async () => {
      await 프로필열기(driver, params.뮤트할계정);
      await 시트.메뉴에서고르기('Mute account');
      await 시트.뮤트하기();
      중 = true;
      await 홈으로돌아가기(driver);
      await verify('뮤트 · 차단에 성공하면 그 계정의 글이 현재 목록에서 바로 빠진다', !(await 상세.본문있나(params.계정글본문)), true);
    }, { capture: true });
  } finally {
    if (중) {
      await 홈으로돌아가기(driver);
      await 프로필열기(driver, params.뮤트할계정);
      await 시트.해제되어있게하기();
    }
  }
});
