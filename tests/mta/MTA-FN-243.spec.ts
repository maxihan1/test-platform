import { defineCase, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-243',
  name: '투표 항목이 2개일 때 손잡이를 끌면 항목이 지워지지 않는다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  held: '보류 — 앱 화면에서 투표 항목 삭제 영역 주소를 못 읽었다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    삭제영역: z.string().min(1).describe('손잡이를 끌어 놓을 삭제 영역의 요소 주소'),
  }),
  expected: z.object({
    최소항목수: z.number().int().describe('끌어도 남는 투표 항목 수').default(2),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    await verify('투표 영역이 보인다', await 글쓰기.투표열기(), true, { blocker: true });
  });

  await test.step('투표 항목이 2개일 때 손잡이를 끌어 본다', async () => {
    await verify('투표 항목이 2개 보인다', await 글쓰기.투표항목수(), expected.최소항목수, { blocker: true });
    await 글쓰기.투표항목을삭제영역으로끌기(0, params.삭제영역);
    await verify('투표 항목이 2개일 때 손잡이를 끌면 항목이 지워지지 않는다', await 글쓰기.투표항목수(), expected.최소항목수);
  });

  await test.step('투표 항목이 3개일 때 손잡이를 길게 눌러 삭제 영역으로 끈다', async () => {
    await 글쓰기.투표칸더하기();
    await verify('투표 항목이 3개 보인다', await 될때까지(driver, async () => (await 글쓰기.투표항목수()) === expected.최소항목수 + 1, 10_000), true, { blocker: true });
    await 글쓰기.투표항목을삭제영역으로끌기(0, params.삭제영역);
    await verify('항목이 2개가 된다', await 될때까지(driver, async () => (await 글쓰기.투표항목수()) === expected.최소항목수, 10_000), true);
  });
});
