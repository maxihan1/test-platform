// 실제 폰 Chrome 실측용 가짜 모바일 케이스 — 상대 주소로 화면을 열고 page.request 로 API 를 부른다 (apps/runner/scenario/real-phone.test.ts)
// 폰 Chrome 의 기본 창에는 baseURL 이 없어 kit · 러너가 상대 주소를 풀어야 돈다

import { defineCase, test, verify } from '@platform/kit';

// 케이스 맨 위 코드도 팜 토큰을 못 읽어야 한다 — kit · 고정 spec 이 케이스보다 먼저 떼어 둔다
const 읽은토큰 = process.env.PLATFORM_APPIUM_TOKEN ?? '없음';

export const spec = defineCase({
  tcId: 'XRP-001',
  name: '폰 Chrome 에서 화면과 API 를 상대 주소로 연다',
  precondition: [],
  params: null,
  expected: null,
  platforms: ['mobile'],
});

test(spec, async ({ page }) => {
  await test.step('화면을 연다', async () => {
    await page.goto('/');
    await verify('제목이 보인다', await page.locator('#t').innerText(), '폰 화면');
  });

  await test.step('팜 토큰이 케이스에 안 보인다', async () => {
    await verify('케이스 맨 위에서 읽은 토큰이 없다', 읽은토큰, '없음');
  });

  await test.step('API 를 부른다', async () => {
    const 답 = await page.request.get('/api/ping');
    await verify('API 가 답한다', await 답.text(), 'pong');
  });
});
