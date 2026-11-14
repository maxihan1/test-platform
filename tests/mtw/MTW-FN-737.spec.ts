import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiGet, 몸 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 필터지우기API } from './helpers/status-api.helper.js';
import { 필터화면 } from './pages/filters.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-737',
  name: '필터 컨텍스트를 하나도 고르지 않고 저장하면 필터가 만들어지지 않는다',
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    키워드한도: z.number().describe('필터 키워드 글자 수 한도').default(512),
  }),
});
test(spec, async ({ page, params, expected }) => {
  const 필터 = new 필터화면(page);
  const 머리 = 표식('flt');
  const 제목들 = ['맥락없음', '맥락하나', '키워드한도', '키워드초과'].map((이름) => `${머리}${이름}`);
  const 있나 = async (제목: string): Promise<boolean> => (await 몸<{ title: string }[]>(await apiGet(page, '/api/v2/filters'))).some((f) => f.title === 제목);
  const 만들기 = async (제목: string, 맥락: boolean, 키워드: string): Promise<void> => {
    await 필터.새로열기();
    await 필터.새제목칸.fill(제목);
    if (맥락) await 필터.맥락('홈 & 리스트').check();
    await 필터.키워드칸.fill(키워드);
    await 필터.저장하기();
  };

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
  });

  try {
    await test.step('필터 만들기에서 컨텍스트를 하나도 고르지 않고 저장한다', async () => {
      await 만들기(제목들[0] ?? '', false, `${머리}k`);
      await verify('필터 컨텍스트를 하나도 고르지 않고 저장하면 필터가 만들어지지 않는다', await 있나(제목들[0] ?? ''), false);
    });

    await test.step('필터 만들기에서 컨텍스트를 하나 고르고 저장한다', async () => {
      await 만들기(제목들[1] ?? '', true, `${머리}k`);
      await verify('컨텍스트를 하나 고른 필터는 만들어진다', await 있나(제목들[1] ?? ''), true);
    });

    await test.step('필터 키워드에 512자를 넣고 저장한다', async () => {
      await 만들기(제목들[2] ?? '', true, 'k'.repeat(expected.키워드한도));
      await verify('512자 키워드는 저장된다', await 있나(제목들[2] ?? ''), true);
    });

    await test.step('필터 키워드에 513자를 넣고 저장한다', async () => {
      await 만들기(제목들[3] ?? '', true, 'k'.repeat(expected.키워드한도 + 1));
      await verify('513자 키워드는 저장되지 않는다', await 있나(제목들[3] ?? ''), false);
    });
  } finally {
    for (const 제목 of 제목들) await 필터지우기API(page, 제목);
  }
});
