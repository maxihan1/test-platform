import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-002',
  name: '「오늘 하루 다시보지 않기」를 체크하고 닫은 팝업은 새로 고쳐도 다시 뜨지 않고 나머지 팝업은 다시 뜬다',
  precondition: ['공지 팝업이 둘 이상 떠 있다'],
  params: null,
  expected: z.object({
    onlyCheckedGone: z.boolean().describe('체크하고 닫은 팝업만 사라질지 여부').default(true),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  const 팝업 = page.getByRole('dialog');
  let 처음 = 0;

  await test.step('홈을 연다', async () => {
    await page.goto('/');
    await 팝업.first().waitFor();
  });

  await test.step('공지 팝업이 둘 이상 뜬 것을 확인한다', async () => {
    처음 = await 팝업.count();
    await verify('공지 팝업이 둘 이상 떠 있다', 처음 >= 2, true, { blocker: true });
  });

  await test.step('첫 팝업의 「오늘 하루 다시보지 않기」를 체크하고 「닫기」를 누른 뒤 홈을 새로 고친다', async () => {
    await 팝업.first().getByText('오늘 하루 다시보지 않기').click();
    await 팝업.first().getByRole('button', { name: '닫기' }).click();
    await page.reload();
    await 팝업.first().waitFor();
    await verify(
      '「오늘 하루 다시보지 않기」를 체크하고 닫은 팝업은 새로 고쳐도 다시 뜨지 않고 나머지 팝업은 다시 뜬다',
      (await 팝업.count()) === 처음 - 1,
      expected.onlyCheckedGone,
    );
  });
});
