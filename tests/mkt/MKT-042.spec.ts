import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-042',
  name: '만족도 설문 모달이 홈에 들어온 지 5초 전에는 뜨지 않고 15초 안에 뜬다',
  precondition: ['이 탭에서 만족도 설문을 닫은 적이 없다'],
  params: z.object({
    slackMs: z.number().describe('응답 지연 여유(ms) — 기획서 REQ-API-005 의 늦은 응답 상한 1.5초').default(1500),
  }),
  expected: z.object({
    minMs: z.number().describe('설문이 뜨기 시작하는 시각(ms, 홈에 들어온 뒤)').default(5000),
    maxMs: z.number().describe('설문이 늦어도 뜨는 시각(ms, 홈에 들어온 뒤)').default(15000),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('홈을 열고 만족도 설문 모달이 뜰 때까지 기다린다', async () => {
    const 설문 = page.getByRole('dialog', { name: '만족도 설문' });
    await page.goto('/');
    const 떴다 = await 설문.waitFor({ timeout: expected.maxMs + params.slackMs }).then(
      () => true,
      () => false,
    );
    const 뜬시각 = await page.evaluate(() => Math.round(performance.now()));
    await verify(
      '만족도 설문 모달이 홈에 들어온 지 5초 전에는 뜨지 않고 15초 안에 뜬다',
      { 뜬시각, 너무이르지않다: 떴다 && 뜬시각 >= expected.minMs, 늦지않다: 떴다 && 뜬시각 <= expected.maxMs + params.slackMs },
      { 뜬시각, 너무이르지않다: true, 늦지않다: true },
    );
  });
});
