import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 두프레임기다리기 } from './helpers/common-tools.helper.js';
import { 그림파일 } from './helpers/board-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-172',
  name: '이미지 3장을 고르면 미리보기 3장이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);

  await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 계정으로로그인(page, params.loginId, params.loginPassword);
    await 안내창막기(page);
    await 쓰기.열기();
    await 머리.그려질때까지();
    await verify('회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('글쓰기에서 이미지 3장을 고른다', async () => {
    await 쓰기.파일고르기([그림파일('그림1.png', 'image/png', 1), 그림파일('그림2.png', 'image/png', 2), 그림파일('그림3.png', 'image/png', 3)]);
    await 쓰기.미리보기수가될때까지(3);
    await verify('이미지 3장을 고르면 미리보기 3장이 보인다', await 쓰기.미리보기들.count(), 3);
  });

  await test.step('이미지 3장 뒤 4장째를 고른다', async () => {
    await 쓰기.파일고르기([그림파일('그림넷째.png', 'image/png', 9)]);
    await 두프레임기다리기(page);
    await verify('이미지 4장째를 고르면 토스트 「이미지는 최대 3장까지 첨부할 수 있습니다」가 보인다', await 알림.글('이미지는 최대 3장까지 첨부할 수 있습니다').isVisible(), true);
  });
});
