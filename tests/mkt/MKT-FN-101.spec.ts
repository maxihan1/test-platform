import { defineCase, test, verify } from '@platform/kit';

type 배너 = { id: number; visible: boolean };

export const spec = defineCase({
  tcId: 'MKT-FN-101',
  name: '배너 · 설정 · 이벤트 띠 API 는 노출 중인 배너와 공지 팝업 켜짐 여부와 띠 문구를 돌려준다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('노출 배너 API 를 부른다', async () => {
    const 배너들 = ((await (await request.get('/api/banners')).json()) as { items: 배너[] }).items;
    await verify(
      '노출 배너 API 는 노출 중인 배너를 순서대로 돌려준다',
      [배너들.length > 0, 배너들.every((배너) => 배너.visible)],
      [true, true],
    );
  });

  await test.step('설정 API 를 부른다', async () => {
    const 설정 = (await (await request.get('/api/settings')).json()) as { noticePopup: unknown };
    await verify('설정 API 는 공지 팝업 켜짐 여부를 돌려준다', typeof 설정.noticePopup, 'boolean');
  });

  await test.step('이벤트 띠 API 를 부른다', async () => {
    const 띠 = (await (await request.get('/api/event-strip')).json()) as { message: unknown };
    await verify('이벤트 띠 API 는 띠 문구를 돌려준다', [typeof 띠.message, String(띠.message).length > 0], ['string', true]);
  });
});
