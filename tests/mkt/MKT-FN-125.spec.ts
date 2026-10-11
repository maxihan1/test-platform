import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-125',
  name: '10MB 파일을 고르면 첨부 파일 칸에 그 파일이 남는다',
  platforms: ['desktop'],
  precondition: ['두 번째 회원으로 로그인해 있다'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 문의 = new 문의화면(page);
  const 머리 = new 머리글(page);
  const 열 = 10 * 1024 * 1024;

  await test.step('두 번째 회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, 둘째아이디, params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('10MB 파일을 첨부 파일로 고른다', async () => {
    await 문의.열기();
    await verify('1:1 문의 화면 제목이 보인다', await 문의.제목.isVisible(), true, { blocker: true });
    await 문의.첨부칸.setInputFiles({ name: 'limit.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(열) });
    await verify('10MB 파일을 고르면 첨부 파일 칸에 그 파일이 남는다', await 문의.고른파일이름들(), ['limit.bin']);
  });

  await test.step('10MB 를 넘는 파일을 첨부 파일로 고른다', async () => {
    await 문의.열기();
    await 문의.첨부칸.setInputFiles({ name: 'over.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(열 + 1) });
    await verify('10MB 를 넘는 파일을 고르면 첨부 파일 칸이 비워진다', await 문의.고른파일이름들(), []);
  });
});
