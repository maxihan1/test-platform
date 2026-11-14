import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiDelete, apiGet, 몸 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-692',
  name: '설정에서 추천 해시태그를 10개까지 더하면 모두 더해진다',
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
  const 설정 = new 계정설정화면(page);
  const 머리 = 표식('ft');
  let 더한수 = 0;

  await test.step('두 번째 사용자로 로그인하고 추천 해시태그 설정을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 설정.열기('/settings/featured_tags');
    await verify('공개 프로필 설정 화면이 열렸다', await 설정.제목.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('추천 해시태그를 10개까지 더한다', async () => {
      const 칸 = 설정.칸(/^해시태그/);
      const 있다 = await 칸.waitFor({ timeout: 5_000 }).then(() => true, () => false);
      for (let i = 0; 있다 && i < expected.한도; i += 1) {
        await 칸.fill(`${머리}${String(i)}`);
        await 설정.보내기(/추가|저장/);
        더한수 += 1;
      }
      await verify('설정에서 추천 해시태그를 10개까지 더하면 모두 더해진다', 있다 && 더한수 === expected.한도, true);
    });

    await test.step('추천 해시태그 11개째를 더한다', async () => {
      const 칸 = 설정.칸(/^해시태그/);
      const 있다 = await 칸.waitFor({ timeout: 5_000 }).then(() => true, () => false);
      if (있다) {
        await 칸.fill(`${머리}x`);
        await 설정.보내기(/추가|저장/);
      }
      const 안내 = 있다 && (await 설정.글('추천 해시태그 최대 개수를 초과합니다').waitFor({ timeout: 10_000 }).then(() => true, () => false));
      await verify('11개째에는 「추천 해시태그 최대 개수를 초과합니다」가 보인다', 안내, true);
    });
  } finally {
    const 목록 = await 몸<{ id: string; name: string }[]>(await apiGet(page, '/api/v1/featured_tags'));
    for (const 태그 of 목록.filter((t) => t.name.startsWith(머리))) await apiDelete(page, `/api/v1/featured_tags/${태그.id}`);
  }
});
