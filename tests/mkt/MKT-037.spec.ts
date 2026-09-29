import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-037',
  name: '배너에 마우스를 올리면 자동 넘김이 멈추고 마우스를 치우면 다시 넘어간다',
  precondition: ['비회원으로 홈에 들어와 있다', '공지 팝업과 만족도 설문을 닫았다', '배너에 마우스를 올려 자동 넘김이 멈춰 있다'],
  params: z.object({
    holdMs: z.number().describe('마우스를 올린 채 기다릴 시간(ms) — 자동 넘김 주기 4초보다 길게').default(5000),
    resumeMs: z.number().describe('마우스를 치운 뒤 다음 장을 기다릴 시간(ms) — 자동 넘김 주기 4초에 여유를 더한 값').default(5500),
  }),
  expected: z.object({
    bannerCount: z.number().describe('배너 장 수').default(3),
    sameWhileHover: z.boolean().describe('마우스를 올린 동안 같은 장이 보일지 여부').default(true),
    movedAfterLeave: z.boolean().describe('마우스를 치운 뒤 다음 장으로 넘어갈지 여부').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 배너 = page.getByRole('region', { name: '배너' });
  const 점 = 배너.getByRole('button', { name: /번 배너$/ });
  const 현재장 = async (): Promise<number> =>
    점.evaluateAll((els) => els.findIndex((e) => e.getAttribute('aria-current') === 'true'));

  await test.step('홈을 열고 공지 팝업과 만족도 설문을 닫는다', async () => {
    await page.goto('/');
    const 공지 = page.getByRole('dialog', { name: '공지사항' });
    await 공지.waitFor();
    await 공지.getByRole('button', { name: '닫기' }).last().click();
    await 공지.waitFor({ state: 'detached' });
    const 설문 = page.getByRole('dialog', { name: '만족도 설문' });
    await 설문.waitFor({ timeout: 20000 });
    await 설문.getByRole('button', { name: '다음에' }).click();
    await 설문.waitFor({ state: 'detached' });
    await 점.first().waitFor();
    await verify('홈 배너가 3장이다', await 점.count(), expected.bannerCount, { blocker: true });
  });

  await test.step('배너에 마우스를 올린 채 자동 넘김 주기보다 길게 기다린다', async () => {
    await 배너.hover();
    const 처음 = await 현재장();
    await page.waitForTimeout(params.holdMs);
    await verify('배너에 마우스를 올리고 있는 동안에는 자동 넘김 주기가 지나도 같은 장이 보인다', (await 현재장()) === 처음, expected.sameWhileHover);
  });

  await test.step('마우스를 배너 밖으로 치우고 기다린다', async () => {
    const 처음 = await 현재장();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(params.resumeMs);
    await verify('마우스를 치우면 자동 넘김이 다시 시작되어 다른 장이 보인다', (await 현재장()) !== 처음, expected.movedAfterLeave);
  });
});
