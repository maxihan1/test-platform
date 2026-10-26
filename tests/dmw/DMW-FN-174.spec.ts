import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 그림파일 } from './helpers/board-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-174',
  name: '첨부한 이미지는 입력칸 아래에 미리보기로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);
  let 처음주소들: string[] = [];

  await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 계정으로로그인(page, params.loginId, params.loginPassword);
    await 안내창막기(page);
    await 쓰기.열기();
    await 머리.그려질때까지();
    await verify('회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('글쓰기에서 png 이미지 두 장을 고른다', async () => {
    await 쓰기.파일고르기([그림파일('그림1.png', 'image/png', 1), 그림파일('그림2.png', 'image/png', 2)]);
    await 쓰기.미리보기수가될때까지(2);
    처음주소들 = await 쓰기.미리보기주소들();
    const 입력칸 = await 쓰기.이미지칸.boundingBox();
    const 첫미리보기 = await 쓰기.미리보기들.first().boundingBox();
    const 두장 = await verify('미리보기가 두 장 보인다', await 쓰기.미리보기들.count(), 2);
    const 아래 = await verify('미리보기가 입력칸 아래에 있다', (첫미리보기?.y ?? 0) >= (입력칸?.y ?? 0) + (입력칸?.height ?? 0), true);
    await verify('첨부한 이미지는 입력칸 아래에 미리보기로 보인다', 두장 && 아래, true);
  });

  await test.step('첫 미리보기의 X 를 누른다', async () => {
    await 쓰기.미리보기빼기들.first().click();
    await 쓰기.미리보기수가될때까지(1);
    await verify('미리보기 X 를 누르면 그 이미지가 빠진다', await 쓰기.미리보기주소들(), [처음주소들[1]]);
  });
});
