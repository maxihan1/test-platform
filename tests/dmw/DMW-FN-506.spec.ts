import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 글자, 두프레임기다리기 } from './helpers/common-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-506',
  name: '글쓰기 제목 칸에 50자를 적으면 50자가 다 들어간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
    한도글자수: z.number().int().describe('제목 칸에 적을 글자 수 — 1자 이상 50자 이하').default(50),
    넘는글자수: z.number().int().describe('제목 칸에 적어 볼 글자 수 — 51자 이상').default(51),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);

  await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 계정으로로그인(page, params.loginId, params.loginPassword);
    await 안내창막기(page);
    await 쓰기.열기();
    await 머리.그려질때까지();
    await verify('회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('글쓰기 제목 칸에 50자를 적는다', async () => {
    await 쓰기.제목칸.fill(글자(params.한도글자수));
    await verify('글쓰기 제목 칸에 50자를 적으면 50자가 다 들어간다', (await 쓰기.제목칸.inputValue()).length, params.한도글자수);
  });

  await test.step('글쓰기 제목 칸에 51자를 적는다', async () => {
    await 쓰기.제목칸.fill(글자(params.넘는글자수));
    await verify('글쓰기 제목 칸에 51자를 적으면 50자까지만 들어간다', (await 쓰기.제목칸.inputValue()).length, 50);
  });

  await test.step('제목 1자로 「등록」을 누른 뒤 토스트를 확인한다', async () => {
    const 알림 = new 토스트(page);
    await 쓰기.채우기({ 분류: '자유', 제목: 글자(1), 본문: '제목 오류 안내를 보는 본문입니다 열 글자가 넘습니다' });
    const 응답 = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/posts' && r.request().method() === 'POST');
    await 쓰기.등록.click();
    await 응답;
    await 두프레임기다리기(page);
    await verify('제목 1자로 등록하면 토스트 「제목은 2~50자입니다」가 보인다', await 알림.글('제목은 2~50자입니다').first().isVisible(), true);
  });
});
