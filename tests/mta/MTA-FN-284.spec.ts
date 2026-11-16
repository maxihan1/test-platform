import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-284',
  name: '글타래 가운데 글 본문을 누르면 제목 「님의 게시물」 글 상세에 앞선 글이 위에, 답글이 아래에 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    가운데글일부: z.string().min(1).describe('seoyeon_books 글타래 가운데 글 본문 — 그 글을 찾는 낱말').default('첫 번째는 장편소설. 400쪽인데 이틀 만에 읽었어요 (2/3)'),
    앞선글일부: z.string().min(1).describe('가운데 글 앞선 글 본문 — 그 글을 찾는 낱말').default('이번 달 읽은 책 정리 글타래 🧵 (1/3)'),
    답글일부: z.string().min(1).describe('가운데 글 답글 본문 — 그 글을 찾는 낱말').default('두 번째는 에세이. 짧은 글이 많아서 출퇴근길에 좋았어요 (3/3)'),
  }),
  expected: z.object({
    제목: z.string().describe('글 상세 제목에 든 글').default('님의 게시물'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('seoyeon_books 글타래 가운데 글 본문을 누른다', async () => {
    await 글상세열기(driver, 'seoyeon_books', params.가운데글일부);
    await verify('글 상세가 열린다', await 글상세.그려질때까지(), true, { blocker: true });
    const 제목 = await verify('글 상세 제목에 「님의 게시물」이 든다', (await driver.$(글상세.제목).getText()).includes(expected.제목), true);
    await 글상세.맨위로올리기();
    await verify('앞선 글 · 가운데 글 · 답글이 글 상세 목록에 보인다', (await 뜰때까지(driver, 글상세.목록글자포함(params.앞선글일부), 10_000)) && (await 뜰때까지(driver, 글상세.목록글자포함(params.답글일부), 10_000)), true, { blocker: true });
    const 가운데 = await 글상세.목록글세로자리(params.가운데글일부);
    const 위 = await verify('앞선 글이 가운데 글보다 위에 보인다', (await 글상세.목록글세로자리(params.앞선글일부)) < 가운데, true);
    const 아래 = await verify('답글이 가운데 글보다 아래에 보인다', (await 글상세.목록글세로자리(params.답글일부)) > 가운데, true);
    await verify('글타래 가운데 글 본문을 누르면 제목 「님의 게시물」 글 상세에 앞선 글이 위에, 답글이 아래에 보인다', 제목 && 위 && 아래, true);
  });
});
