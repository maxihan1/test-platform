import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-012',
  name: '타임세일 카운트다운이 「HH:MM:SS」 모양이고 1초 뒤 값이 줄어든다',
  precondition: ['비회원으로 홈에 들어와 있다'],
  params: null,
  expected: z.object({
    shapeOk: z.boolean().describe('「HH:MM:SS」 모양일지 여부').default(true),
    decreased: z.boolean().describe('1초 뒤 값이 줄어들지 여부').default(true),
  }),
});

const 초 = (글: string): number => {
  const [시, 분, 초값] = (/(\d{2}):(\d{2}):(\d{2})/.exec(글) ?? ['', '-1', '0', '0']).slice(1).map(Number);
  return 시 * 3600 + 분 * 60 + 초값;
};

test(spec, async ({ page, expected }) => {
  await test.step('타임세일 카운트다운을 1초 뒤에 다시 본다', async () => {
    await page.goto('/');
    const 시계 = page.getByText(/^타임세일 종료까지 \d{2}:\d{2}:\d{2}$/);
    await 시계.waitFor();
    const 처음 = await 시계.innerText();
    await page.getByText(처음, { exact: true }).waitFor({ state: 'detached' });
    const 나중 = await page.getByText(/^타임세일 종료까지 \d{2}:\d{2}:\d{2}$/).innerText();
    await verify(
      '타임세일 카운트다운이 「HH:MM:SS」 모양이고 1초 뒤 값이 줄어든다',
      { 모양: /^타임세일 종료까지 \d{2}:\d{2}:\d{2}$/.test(나중), 줄었다: 초(나중) < 초(처음) },
      { 모양: expected.shapeOk, 줄었다: expected.decreased },
    );
  });
});
