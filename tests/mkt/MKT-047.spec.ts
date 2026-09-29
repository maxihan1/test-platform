import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-047',
  name: '「로그인 상태 유지」를 체크하면 로그인이 7일 유지되어 브라우저를 닫았다 열어도 로그인돼 있고 체크하지 않으면 닫을 때 사라진다',
  precondition: ['테스트 회원 계정이 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 아이디').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
    sessionCookie: z.string().min(1).describe('로그인 쿠키 이름').default('dm_sid'),
  }),
  expected: z.object({
    closesWithBrowser: z.boolean().describe('체크하지 않았을 때 로그인 쿠키가 브라우저를 닫으면 사라지는지').default(true),
    keepDays: z.number().describe('체크했을 때 로그인이 유지되는 날 수').default(7),
    keptAfterReopen: z.boolean().describe('체크했을 때 브라우저를 닫았다 열어도 로그인돼 있는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 로그인한다 = async (유지: boolean) => {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.loginId ?? '');
    await page.getByLabel('비밀번호').fill(params.loginPassword ?? '');
    await page.getByLabel('로그인 상태 유지').setChecked(유지);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.getByRole('banner').getByRole('button', { name: '알림' }).waitFor();
    return (await page.context().cookies()).find((c) => c.name === params.sessionCookie);
  };

  await test.step('「로그인 상태 유지」를 체크하지 않고 로그인한다', async () => {
    const 쿠키 = await 로그인한다(false);
    await verify(
      '「로그인 상태 유지」를 체크하지 않고 로그인하면 로그인 쿠키가 브라우저를 닫을 때 사라진다',
      쿠키?.expires === -1,
      expected.closesWithBrowser,
    );
  });

  await test.step('로그인 쿠키를 지우고 「로그인 상태 유지」를 체크해 다시 로그인한다', async () => {
    await page.context().clearCookies();
    const 쿠키 = await 로그인한다(true);
    const 남은시간 = Math.round(((쿠키?.expires ?? 0) - Date.now() / 1000) / 3600);
    await verify('「로그인 상태 유지」를 체크하고 로그인하면 로그인 쿠키가 7일 뒤에 만료된다', 남은시간, expected.keepDays * 24);
  });

  await test.step('브라우저를 닫았다 다시 열어 홈을 본다', async () => {
    const 남는쿠키 = (await page.context().cookies()).filter((c) => c.expires !== -1);
    const 새창 = await page.context().browser()!.newContext();
    await 새창.addCookies(남는쿠키);
    const 새화면 = await 새창.newPage();
    await 새화면.goto(new URL('/', page.url()).href);
    const 머리글 = 새화면.getByRole('banner');
    await 머리글.getByRole('button', { name: '알림' }).or(머리글.getByRole('link', { name: '로그인' })).waitFor();
    const 로그인돼있다 = await 머리글.getByRole('button', { name: '로그아웃' }).isVisible();
    await 새창.close();
    await verify('「로그인 상태 유지」로 로그인하면 브라우저를 닫았다 열어도 머리글에 「로그아웃」이 보인다', 로그인돼있다, expected.keptAfterReopen);
  });
});
