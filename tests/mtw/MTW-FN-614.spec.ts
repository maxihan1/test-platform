import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiGet, 몸 } from './helpers/api.helper.js';
import { 리스트지우기API, 리스트채우기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 리스트만들기화면 } from './pages/list-new.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-614',
  name: '리스트를 50개째까지 만들면 모두 만들어진다',
  techniques: ['경계값 분석'],
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 리스트만들기화면(page);
  let 만든것: string[] = [];

  try {
    await test.step('두 번째 사용자로 로그인한다', async () => {
      await 로그인하기(page, params.secondId, params.secondPassword);
      const 이전 = await 몸<{ id: string; title: string }[]>(await apiGet(page, '/api/v1/lists'));
      await 리스트지우기API(page, 이전.filter((리스트) => 리스트.title.startsWith('tclist')).map((리스트) => 리스트.id));
      const 기존 = await 몸<{ id: string }[]>(await apiGet(page, '/api/v1/lists'));
      await verify('두 번째 사용자의 기존 리스트가 50개보다 적다', 기존.length < 50, true, { blocker: true });
    });

    await test.step('두 번째 사용자 리스트가 50개가 되도록 만든다', async () => {
      const 기존 = await 몸<{ id: string }[]>(await apiGet(page, '/api/v1/lists'));
      const 이름 = 표식('list');
      만든것 = await 리스트채우기API(page, Array.from({ length: 50 - 기존.length }, (_, 순서) => `${이름}${String(순서)}`));
      await verify('리스트를 50개째까지 만들면 모두 만들어진다', (await 몸<{ id: string }[]>(await apiGet(page, '/api/v1/lists'))).length, 50);
    });

    await test.step('리스트 만들기 화면에서 51개째 리스트를 만든다', async () => {
      await 화면.열기();
      await 화면.이름넣기(표식('over'));
      await 화면.만들기누르기();
      const 보인다 = await 화면.한도오류떴나();
      await verify('51개째 리스트에는 「리스트 최대 개수를 초과합니다」가 보인다', 보인다, true);
    });
  } finally {
    await 리스트지우기API(page, 만든것);
  }
});
