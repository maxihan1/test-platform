import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { PNG만들기 } from './helpers/media.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-359',
  name: '대체 텍스트를 10,000자로 넣으면 저장된다',
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    한도글자수: z.number().int().min(1).max(10000).describe('한도에 맞춰 넣는 대체 텍스트 글자 수 — 1 이상 10000 이하').default(10000),
    넘는글자수: z.number().int().min(10001).max(10100).describe('한도를 넘겨 넣는 대체 텍스트 글자 수 — 10001 이상 10100 이하').default(10001),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);

  await test.step('일반 회원으로 로그인하고 이미지를 첨부한 작성 상자를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await 글쓰기.이미지넣기(await PNG만들기(page, '대체한도.png', 64, 64, true), 1);
    await verify('작성 상자에 첨부한 이미지가 보인다', await 글쓰기.첨부썸네일들.count(), 1, { blocker: true });
  });

  await test.step('대체 텍스트 칸에 10,000자를 넣고 「완료」를 누른다', async () => {
    await 글쓰기.대체텍스트창열기();
    await 글쓰기.대체텍스트칸.fill('가'.repeat(params.한도글자수));
    await 글쓰기.대체텍스트완료누르기();
    await 글쓰기.창.닫힐때까지();
    await 글쓰기.대체텍스트창열기();
    await verify('대체 텍스트를 10,000자로 넣으면 저장된다', (await 글쓰기.대체텍스트칸.inputValue()).length, params.한도글자수);
  });

  await test.step('대체 텍스트 칸에 10,001자를 넣는다', async () => {
    await 글쓰기.대체텍스트칸.fill('가'.repeat(params.넘는글자수));
    const 꺼졌다 = await 글쓰기.대체텍스트완료꺼짐.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('10,001자 대체 텍스트는 저장되지 않는다', 꺼졌다, true);
  });
});
