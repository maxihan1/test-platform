import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로 } from './helpers/api.helper.js';
import { 글상태API, 인용글찾기API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-463',
  name: '부스트 · 인용된 내 글을 열면 부스트 카운터에 부스트 수와 인용 수를 더한 값이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 글상세화면(page);
  let 합계 = '';
  let 경로 = '';

  await test.step('일반 회원으로 로그인하고 jiho_cafe 가 인용한 내 글을 찾는다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const { 원글 } = await 인용글찾기API(page, 'jiho_cafe');
    const 상태 = await 글상태API(page, 원글.id);
    합계 = String(상태.reblogs_count + 상태.quotes_count);
    경로 = 글경로(원글);
    await verify('인용된 내 글의 주소가 있다', 경로.length > 0, true, { blocker: true });
  });

  await test.step('jiho_cafe 가 인용한 내 글 상세를 연다', async () => {
    await 상세.열기(경로);
    await verify('부스트 · 인용된 내 글을 열면 부스트 카운터에 부스트 수와 인용 수를 더한 값이 보인다', (await 상세.부스트수링크.innerText()).replace(/\s+/g, ' ').trim(), `${합계} 부스트`);
  });
});
