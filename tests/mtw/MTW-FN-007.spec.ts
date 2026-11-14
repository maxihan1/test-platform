import { defineCase, test, verify } from '@platform/kit';


export const spec = defineCase({
  tcId: 'MTW-FN-007',
  name: '인스턴스 정보 API 를 부르면 가입이 열려 있다고 나온다',
  smoke: true,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});
interface 가입정보 {
  enabled?: boolean;
  approval_required?: boolean;
  reason_required?: boolean;
  min_age?: number | null;
}

test(spec, async ({ request }) => {
  let 가입: 가입정보 = {};

  await test.step('인스턴스 정보 API 를 부른다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    await verify('인스턴스 정보 API 가 200 으로 돌아온다', 응답.status(), 200, { blocker: true });
    가입 = ((await 응답.json()) as { registrations?: 가입정보 }).registrations ?? {};
    await verify('인스턴스 정보 API 를 부르면 가입이 열려 있다고 나온다', 가입.enabled, true);
    const 승인 = await verify('가입 승인이 필요 없다고 나온다', 가입.approval_required === true, false);
    const 사유 = await verify('가입 사유가 필요 없다고 나온다', 가입.reason_required === true, false);
    await verify('가입에 승인과 가입 사유가 필요 없다고 나온다', 승인 && 사유, true);
    await verify('가입 최소 연령이 없다고 나온다', 가입.min_age ?? null, null);
  });
});
