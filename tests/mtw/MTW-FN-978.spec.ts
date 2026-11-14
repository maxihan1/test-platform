import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiGet, 몸 } from './helpers/api.helper.js';
import { 계정창열기 } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 리스트상세화면 } from './pages/list-detail.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-978',
  name: '남의 리스트 주소를 열면 그 리스트 이름과 글이 보이지 않는다',
  techniques: ['오류 추정'],
  precondition: ['두 번째 사용자의 「사진」 리스트 주소가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 리스트상세화면(page);
  let 남의리스트 = '';

  await test.step('두 번째 사용자의 「사진」 리스트 번호를 찾는다', async () => {
    const 창 = await 계정창열기(page, params.secondId, params.secondPassword);
    try {
      const 목록 = await 몸<{ id: string; title: string }[]>(await apiGet(창.page, '/api/v1/lists'));
      남의리스트 = 목록.find((리스트) => 리스트.title === '사진')?.id ?? '';
    } finally {
      await 창.창묶음.close();
    }
    await verify('두 번째 사용자의 「사진」 리스트 번호를 찾았다', 남의리스트 !== '', true, { blocker: true });
  });

  await test.step('일반 회원으로 그 리스트 주소를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 상세.열기(`/lists/${남의리스트}`);
    await 상세.알림.글('Record not found').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 이름 = await verify('남의 리스트의 이름이 보이지 않는다', (await 상세.제목.innerText()) === '사진', false);
    const 글 = await verify('남의 리스트의 글이 보이지 않는다', await 상세.글들.count(), 0);
    await verify('남의 리스트 주소를 열면 그 리스트 이름과 글이 보이지 않는다', 이름 && 글, true);
  });
});
