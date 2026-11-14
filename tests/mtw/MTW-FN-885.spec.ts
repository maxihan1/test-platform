import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiDelete, apiGet, apiPost, 몸 } from './helpers/api.helper.js';
import { 내계정API } from './helpers/api.helper.js';
import { 리스트지우기API, 리스트채우기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';

export const spec = defineCase({
  tcId: 'MTW-FN-885',
  name: '리스트 한도를 넘겨 만들면 「리스트 최대 개수를 초과합니다」가 돌아온다',
  precondition: ['관리자로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 리스트들: string[] = [];
  const 태그들: string[] = [];
  const 컬렉션들: string[] = [];

  try {
    await test.step('관리자로 로그인한다', async () => {
      await 로그인하기(page, params.adminId, params.adminPassword);
      await verify('관리자 계정으로 API 를 부를 수 있다', (await apiGet(page, '/api/v1/lists')).ok(), true, { blocker: true });
    });

    await test.step('관리자 리스트를 50개 채운 뒤 하나 더 API 로 만든다', async () => {
      const 기존 = await 몸<{ id: string }[]>(await apiGet(page, '/api/v1/lists'));
      const 이름 = 표식('list');
      리스트들 = await 리스트채우기API(page, Array.from({ length: 50 - 기존.length }, (_, 순서) => `${이름}${String(순서)}`));
      const 응답 = await apiPost(page, '/api/v1/lists', { title: 표식('over') });
      await verify('리스트 한도를 넘겨 만들면 「리스트 최대 개수를 초과합니다」가 돌아온다', (await 응답.text()).includes('리스트 최대 개수를 초과합니다'), true);
    });

    await test.step('관리자 추천 해시태그를 10개 채운 뒤 하나 더 API 로 더한다', async () => {
      const 기존 = await 몸<{ id: string }[]>(await apiGet(page, '/api/v1/featured_tags'));
      const 이름 = 표식('ft');
      for (let 순서 = 0; 순서 < 10 - 기존.length; 순서 += 1) {
        태그들.push((await 몸<{ id: string }>(await apiPost(page, '/api/v1/featured_tags', { name: `${이름}${String(순서)}` }))).id);
      }
      const 응답 = await apiPost(page, '/api/v1/featured_tags', { name: `${이름}over` });
      await verify('추천 해시태그 한도 초과에는 「추천 해시태그 최대 개수를 초과합니다」가 돌아온다', (await 응답.text()).includes('추천 해시태그 최대 개수를 초과합니다'), true);
    });

    await test.step('관리자 컬렉션을 한도까지 채운 뒤 하나 더 API 로 만든다', async () => {
      const 나 = await 내계정API(page);
      const 기존 = await 몸<{ collections: { id: string }[] }>(await apiGet(page, `/api/v1/accounts/${나.id}/collections`));
      const 이름 = 표식('col');
      for (let 순서 = 0; 순서 < 10 - 기존.collections.length; 순서 += 1) {
        const 만듦 = await 몸<{ collection: { id: string } }>(await apiPost(page, '/api/v1/collections', { name: `${이름}${String(순서)}`, description: '', discoverable: true, sensitive: false, account_ids: [], language: 'ko' }));
        컬렉션들.push(만듦.collection.id);
      }
      const 응답 = await apiPost(page, '/api/v1/collections', { name: `${이름}over`, description: '', discoverable: true, sensitive: false, account_ids: [], language: 'ko' });
      await verify('컬렉션 한도 초과에는 「컬렉션의 최대 개수에 도달하였습니다」가 돌아온다', (await 응답.text()).includes('컬렉션의 최대 개수에 도달하였습니다'), true);
    });
  } finally {
    await 리스트지우기API(page, 리스트들);
    for (const 번호 of 태그들) await apiDelete(page, `/api/v1/featured_tags/${번호}`);
    for (const 번호 of 컬렉션들) await apiDelete(page, `/api/v1/collections/${번호}`);
  }
});
