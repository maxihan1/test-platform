import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiDelete, apiGet, apiPost, 몸 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 추천해시태그편집화면 } from './pages/featured-tags.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-599',
  name: '추천 해시태그를 10개까지 더하면 10개가 다 보인다',
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 편집 = new 추천해시태그편집화면(page);
  const 만든것: string[] = [];
  const 이름들 = Array.from({ length: 11 }, (_, 순서) => `${표식('ft')}${String(순서)}`);

  try {
    await test.step('일반 회원으로 로그인하고 추천 해시태그를 9개까지 채운다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      const 기존 = (await 몸<{ id: string }[]>(await apiGet(page, '/api/v1/featured_tags'))).length;
      for (const 이름 of 이름들.slice(0, 9 - 기존)) {
        만든것.push((await 몸<{ id: string }>(await apiPost(page, '/api/v1/featured_tags', { name: 이름 }))).id);
      }
      await 편집.열기();
      await 편집.태그들.nth(8).waitFor();
      await verify('추천 해시태그 편집 화면에 태그가 9개 보인다', await 편집.태그들.count(), 9, { blocker: true });
    });

    await test.step('프로필 편집에서 추천 해시태그를 10개까지 더한다', async () => {
      await 편집.더하기(이름들[9] ?? '');
      await 편집.태그(이름들[9] ?? '').waitFor();
      await verify('추천 해시태그를 10개까지 더하면 10개가 다 보인다', await 편집.태그들.count(), 10);
    });

    await test.step('추천 해시태그 11번째를 더한다', async () => {
      const 응답 = await apiPost(page, '/api/v1/featured_tags', { name: 이름들[10] ?? '' });
      const 개수 = (await 몸<{ id: string }[]>(await apiGet(page, '/api/v1/featured_tags'))).length;
      await verify('11번째 추천 해시태그 요청이 거절된다', 응답.ok(), false);
      await verify('11번째 추천 해시태그는 더해지지 않는다', 개수, 10);
    });
  } finally {
    const 지금 = await 몸<{ id: string; name: string }[]>(await apiGet(page, '/api/v1/featured_tags'));
    for (const 태그 of 지금.filter((t) => 이름들.some((이름) => 이름 === t.name))) await apiDelete(page, `/api/v1/featured_tags/${태그.id}`);
  }
});
