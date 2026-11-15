import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiDelete, apiGet, apiPost, 몸 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 추천해시태그편집화면 } from './pages/featured-tags.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-692',
  name: '프로필 편집에서 추천 해시태그를 10개까지 더하면 모두 더해진다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    한도: z.number().describe('추천 해시태그 개수 한도').default(10),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 편집 = new 추천해시태그편집화면(page);
  const 머리 = 표식('ft');
  let 정리할수 = false;

  try {
    await test.step('두 번째 사용자로 로그인하고 추천 해시태그를 9개까지 채운다', async () => {
      await 로그인하기(page, params.secondId, params.secondPassword);
      정리할수 = true;
      const 지난것 = await 몸<{ id: string; name: string }[]>(await apiGet(page, '/api/v1/featured_tags'));
      for (const 태그 of 지난것.filter((t) => t.name.startsWith('tcft'))) await apiDelete(page, `/api/v1/featured_tags/${태그.id}`);
      const 기존 = (await 몸<{ id: string }[]>(await apiGet(page, '/api/v1/featured_tags'))).length;
      for (let 순서 = 0; 순서 < expected.한도 - 1 - 기존; 순서 += 1) {
        await apiPost(page, '/api/v1/featured_tags', { name: `${머리}${String(순서)}` });
      }
      await 편집.열기();
      await 편집.태그들.nth(expected.한도 - 2).waitFor();
      await verify('추천 해시태그 편집 화면에 태그가 9개 보인다', await 편집.태그들.count(), expected.한도 - 1, { blocker: true });
    });

    await test.step('추천 해시태그를 10개까지 더한다', async () => {
      await 편집.더하기(`${머리}last`);
      await 편집.태그(`${머리}last`).waitFor();
      await verify('프로필 편집에서 추천 해시태그를 10개까지 더하면 모두 더해진다', await 편집.태그들.count(), expected.한도);
    });

    await test.step('추천 해시태그를 10개 채운 뒤 11개째를 더하려 한다', async () => {
      const 안내 = await 편집.한도안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('11개째에는 「추천 해시태그 최대 개수를 초과합니다.」가 보인다', 안내, true);
    });
  } finally {
    if (정리할수) {
      const 목록 = await 몸<{ id: string; name: string }[]>(await apiGet(page, '/api/v1/featured_tags'));
      for (const 태그 of 목록.filter((t) => t.name.startsWith(머리))) await apiDelete(page, `/api/v1/featured_tags/${태그.id}`);
    }
  }
});
