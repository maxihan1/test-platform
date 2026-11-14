import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiDelete, apiGet, apiPost, 몸 } from './helpers/api.helper.js';
import { 내계정API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 컬렉션만들기화면 } from './pages/collection-new.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-982',
  name: '컬렉션이 한도에 닿은 뒤 새로 만들면 「컬렉션의 최대 개수에 도달하였습니다」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 컬렉션만들기화면(page);
  const 만든것: string[] = [];

  try {
    await test.step('일반 회원으로 로그인하고 컬렉션을 한도까지 만든다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      const 나 = await 내계정API(page);
      const 기존 = await 몸<{ collections: { id: string }[] }>(await apiGet(page, `/api/v1/accounts/${나.id}/collections`));
      const 이름 = 표식('col');
      for (let 순서 = 0; 순서 < 10 - 기존.collections.length; 순서 += 1) {
        const 만듦 = await 몸<{ collection: { id: string } }>(await apiPost(page, '/api/v1/collections', { name: `${이름}${String(순서)}`, description: '', discoverable: true, sensitive: false, account_ids: [], language: 'ko' }));
        만든것.push(만듦.collection.id);
      }
      await verify('컬렉션이 10개가 됐다', (await 몸<{ collections: { id: string }[] }>(await apiGet(page, `/api/v1/accounts/${나.id}/collections`))).collections.length, 10, { blocker: true });
    });

    await test.step('컬렉션을 한도까지 만든 뒤 하나 더 만든다', async () => {
      await 화면.열기();
      const 보인다 = await 화면.한도안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('컬렉션이 한도에 닿은 뒤 새로 만들면 「컬렉션의 최대 개수에 도달하였습니다」가 보인다', 보인다, true);
    });
  } finally {
    for (const 번호 of 만든것) await apiDelete(page, `/api/v1/collections/${번호}`);
  }
});
