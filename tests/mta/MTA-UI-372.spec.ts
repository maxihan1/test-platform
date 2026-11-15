import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글읽기 } from './helpers/app.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-372',
  name: '글 신고 첫 화면에 제목 「게시물 신고」 · 「이 게시물에 어떤 문제가 있나요?」 · 「가장 알맞은 것을 선택하세요」 · 「다음」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목글: z.string().describe('글 신고 첫 화면 제목').default('게시물 신고'),
    질문글: z.string().describe('글 신고 첫 화면 질문').default('이 게시물에 어떤 문제가 있나요?'),
    안내글: z.string().describe('글 신고 첫 화면 안내').default('가장 알맞은 것을 선택하세요'),
    다음글: z.string().describe('글 신고 첫 화면 단추 글').default('다음'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 신고 = new 신고화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('minjun_dev 글 더보기에서 「민준 신고」를 누른다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    await driver.$(프로필.굴려서더보기).click();
    await 프로필.메뉴항목누르기('민준 신고');
    await verify('글 신고 첫 화면이 열린다', await 신고.그려질때까지(), true, { blocker: true });
    const 제목 = await verify('글 신고 첫 화면 제목이 「게시물 신고」로 보인다', await 글읽기(driver, 신고.제목), expected.제목글);
    const 질문 = await verify('글 신고 첫 화면에 「이 게시물에 어떤 문제가 있나요?」가 보인다', await 글읽기(driver, 신고.질문), expected.질문글);
    const 안내 = await verify('글 신고 첫 화면에 「가장 알맞은 것을 선택하세요」가 보인다', await 글읽기(driver, 신고.안내), expected.안내글);
    const 다음 = await verify('글 신고 첫 화면에 「다음」이 보인다', await 글읽기(driver, 신고.다음), expected.다음글);
    await verify('글 신고 첫 화면에 제목 「게시물 신고」 · 「이 게시물에 어떤 문제가 있나요?」 · 「가장 알맞은 것을 선택하세요」 · 「다음」이 보인다', 제목 && 질문 && 안내 && 다음, true);
  });
});
