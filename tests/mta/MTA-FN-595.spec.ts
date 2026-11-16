import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 파일선택기로첨부 } from './helpers/media.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-595',
  name: '아주 큰 사진을 첨부하면 크기 오류 없이 업로드가 끝난다',
  platforms: ['android'],
  held: '보류 — 화소 수를 정한 큰 사진을 폰에 넣을 길이 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사진이름: z.string().min(1).describe('폰에 넣어 둔 아주 큰 사진의 파일 이름'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('아주 큰 사진을 첨부한다', async () => {
    await verify('파일 선택기에서 큰 사진을 골라 선택기가 닫힌다', await 파일선택기로첨부(driver, params.사진이름), true, { blocker: true });
    const 조각 = await verify('첨부 조각이 한 개 보인다', await 글쓰기.조각수가될때까지(1, 60_000), true);
    const 끝 = await verify('업로드가 끝나 「게시」가 켜진다', await 뜰때까지(driver, 글쓰기.게시켜짐, 60_000), true);
    await verify('아주 큰 사진을 첨부하면 크기 오류 없이 업로드가 끝난다', 조각 && 끝, true);
  });
});
