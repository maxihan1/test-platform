import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가, 비밀키있나 } from './helpers/maintenance-dash.helper.js';
import { 계정번호, 계정목록, 계정상세읽기 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-730',
  name: '계정 목록 · 상세 API 를 부르면 응답에 비밀번호 해시와 솔트가 없다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 계정 = 0;

  await test.step('운영자 계정으로 로그인하고 qa_player2 의 계정 번호를 찾는다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    계정 = await 계정번호(page, 'qa_player2');
    await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
  });

  await test.step('계정 목록 API 와 qa_player2 상세 API 를 부른다', async () => {
    const 목록 = await 계정목록(page);
    const 상세 = await 계정상세읽기(page, 계정);
    const 목록응답 = await verify('계정 목록 응답에 비밀번호 해시와 솔트가 없다', 비밀키있나(목록), false);
    const 상세응답 = await verify('계정 상세 응답에 비밀번호 해시와 솔트가 없다', 비밀키있나(상세), false);
    await verify('계정 목록 · 상세 API 를 부르면 응답에 비밀번호 해시와 솔트가 없다', 목록응답 && 상세응답, true);
  });
});
