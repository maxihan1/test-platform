import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-038',
  name: '관리자가 배너 순서와 노출을 바꿔 저장하면 홈 배너가 그 순서와 노출대로 보인다',
  precondition: [
    '관리자 계정이 있다',
    '배너 저장과 홈 배너 조회 응답은 가짜 응답(모킹)이다 — 서버의 배너 설정은 바뀌지 않고, 홈에 노출 배너만 골라 보내는 일도 서버가 아니라 모킹이 한다',
  ],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').optional(),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    adminLinkVisible: z.boolean().describe('머리글에 「관리자」 링크가 보일지 여부').default(true),
    visibleAfterSave: z.number().describe('배너 3장 가운데 하나를 끈 뒤 노출 배너 수').default(2),
    firstMoved: z.boolean().describe('첫 배너를 내린 뒤 첫 자리가 바뀔지 여부').default(true),
    homeOrder: z
      .string()
      .describe('홈에 보일 배너 — 조작 전 관리자 목록에서 몇 번째 배너였는지를 차례대로. 첫 배너를 한 칸 내리면 2·1·3, 마지막을 끄면 2·1 (기획서 REQ-HOME-004 · REQ-ADM-003 에 배너 이름이 없어 조작에서 따라 나온 순서로 적는다)')
      .default('2, 1'),
  }),
});

interface 배너항목 {
  id: number;
  title: string;
  visible: boolean;
}

test(spec, async ({ page, params, expected }) => {
  let 원본: 배너항목[] = [];
  let 저장: 배너항목[] | null = null;
  await page.context().route('**/api/admin/banners', async (route) => {
    if (route.request().method() === 'PUT') {
      const 보낸것 = route.request().postDataJSON() as { items: { id: number; visible: boolean }[] };
      저장 = 보낸것.items.map((r) => ({ ...(원본.find((b) => b.id === r.id) ?? { id: r.id, title: '' }), visible: r.visible }));
      await route.fulfill({ json: { items: 저장 } });
      return;
    }
    const 응답 = await route.fetch();
    원본 = ((await 응답.json()) as { items: 배너항목[] }).items;
    await route.fulfill({ response: 응답 });
  });
  await page.context().route('**/api/banners', async (route) => {
    if (저장 === null) {
      await route.fallback();
      return;
    }
    await route.fulfill({ json: { items: 저장.filter((b) => b.visible) } });
  });

  await test.step('관리자 계정으로 로그인한다', async () => {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.adminId ?? '');
    await page.getByLabel('비밀번호').fill(params.adminPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
  });

  await test.step('관리자로 로그인했는지 머리글을 본다', async () => {
    const 머리글 = page.getByRole('banner');
    await 머리글.getByRole('button', { name: '알림' }).waitFor();
    await verify('머리글에 「관리자」 링크가 보인다', await 머리글.getByRole('link', { name: '관리자' }).isVisible(), expected.adminLinkVisible, { blocker: true });
  });

  let 처음이름: string[] = [];
  await test.step('관리자 화면 배너 관리에서 첫 배너를 한 칸 내리고 마지막 배너의 노출을 끈 뒤 「저장」을 누른다', async () => {
    await page.goto('/admin');
    await page.getByRole('tab', { name: '배너 관리' }).click();
    const 패널 = page.getByRole('tabpanel', { name: '배너 관리' });
    const 아래로 = 패널.getByRole('button', { name: / 아래로$/ });
    await 패널.getByRole('switch', { name: '노출' }).first().waitFor();
    처음이름 = (await 아래로.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))).map((t) => t.replace(/ 아래로$/, ''));
    await 아래로.first().click();
    await 패널.getByRole('switch', { name: '노출' }).last().uncheck();
    await 패널.getByRole('button', { name: '저장' }).click();
    await page.getByRole('status').filter({ hasText: '저장되었습니다' }).waitFor();
    const 지금첫자리 = (await 아래로.first().getAttribute('aria-label'))?.replace(/ 아래로$/, '');
    await verify(
      '배너 관리에서 첫 배너를 내리고 마지막 배너를 끄면 노출 배너가 2장이고 첫 자리가 바뀐다',
      { 노출: await 패널.getByRole('switch', { name: '노출', checked: true }).count(), 첫자리바뀜: 지금첫자리 !== 처음이름[0] },
      { 노출: expected.visibleAfterSave, 첫자리바뀜: expected.firstMoved },
      { blocker: true },
    );
  });

  await test.step('홈을 연다', async () => {
    await page.goto('/');
    const 배너 = page.getByRole('region', { name: '배너' });
    await 배너.getByRole('group').first().waitFor();
    const 홈자리 = (await 배너.getByRole('heading').allInnerTexts()).map((t) => 처음이름.indexOf(t.trim()) + 1);
    await verify('관리자가 배너 순서와 노출을 바꿔 저장하면 홈 배너가 그 순서와 노출대로 보인다', 홈자리.join(', '), expected.homeOrder);
  });
});
