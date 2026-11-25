// 정기 실행 기능 줄이 「프로시저 작성」을 켠 애플리케이션의 UI 번호 케이스까지 담고, 러너가 프로시저를 못 돌아 뺀 것을 회차 기록에 남긴다 (도메인/정기실행 §3.16 「테스트 프로시저」)
import { beforeEach, describe, expect, it, vi } from 'vitest';

const 가짜 = vi.hoisted(() => ({ listCases: vi.fn(), createRun: vi.fn(), dispatch: vi.fn() }));
vi.mock('../catalog/store.js', () => ({ listCases: 가짜.listCases }));
vi.mock('../execution/dispatcher.js', () => ({ dispatch: 가짜.dispatch }));
vi.mock('../execution/store.js', async (원본) => ({ ...(await 원본<typeof import('../execution/store.js')>()), createRun: 가짜.createRun }));

const { 줄돌리기 } = await import('./make.js');
const { RunInputError } = await import('../execution/store.js');
type 재료 = import('./check.js').재료;

const 재료 = (procedureMode: boolean): 재료 => ({
  projectId: 1,
  앱들: new Map([[1, { id: 1, prefix: 'MTA', name: 'MTA', kind: 'APP', isActive: true, projectId: 1, procedureMode }]]),
  서버들: new Map([[1, new Map([['qa', false]])]]),
  시나리오: new Map(),
  호환성: new Map(),
  살아있는케이스: new Set(),
});
const 기능전체 = { kind: 'FN' as const, serviceId: 1, tcIds: null, scenarioId: null, compatSetId: null };
const 고름 = new Map([[1, 'qa']]);
const 회차 = { occurrenceId: 9, setName: '밤 회귀', base: false };
const 조용히 = () => undefined;
const 케이스 = (tcId: string) => ({ tcId, platforms: ['android'] });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEVICE_FARM_URL = 'http://farm.test';
  가짜.listCases.mockResolvedValue({ items: [케이스('MTA-FN-001'), 케이스('MTA-UI-002')] });
  가짜.dispatch.mockResolvedValue(undefined);
  가짜.createRun.mockResolvedValue({ runId: 7, attachedTo: null, items: [], procSkipped: 0 });
});

const 담은번호 = () => (가짜.createRun.mock.calls[0]![0] as { items: { tcId: string }[] }).items.map((i) => i.tcId);

describe('정기 실행 기능 줄 — 프로시저 작성 스위치', () => {
  it('켠 애플리케이션의 기능 「전체」는 UI 번호 케이스까지 한 실행에 담는다', async () => {
    expect(await 줄돌리기(기능전체, 고름, 재료(true), 회차, 조용히)).toEqual({ runId: 7 });
    expect(담은번호()).toEqual(['MTA-FN-001', 'MTA-UI-002']);
  });

  it('꺼진 애플리케이션의 기능 「전체」는 기능 번호만 담는다', async () => {
    await 줄돌리기(기능전체, 고름, 재료(false), 회차, 조용히);
    expect(담은번호()).toEqual(['MTA-FN-001']);
  });

  it('러너가 프로시저를 못 돌아 일부를 뺐으면 실행은 서고 RUNNER_NO_PROCEDURE 를 남긴다', async () => {
    가짜.createRun.mockResolvedValue({ runId: 7, attachedTo: null, items: [], procSkipped: 1 });
    expect(await 줄돌리기(기능전체, 고름, 재료(true), 회차, 조용히)).toEqual({ runId: 7, 앞말: ['RUNNER_NO_PROCEDURE'] });
  });

  it('다 빠졌으면 RUNNER_NO_PROCEDURE 와 NO_CASE 를 남기고 다른 NO_ITEMS 는 오류 문구 그대로다', async () => {
    가짜.createRun.mockRejectedValueOnce(new RunInputError('NO_ITEMS', '러너가 테스트 프로시저를 실행하지 못해 실행할 케이스가 없다', { procSkipped: 2 }));
    expect(await 줄돌리기(기능전체, 고름, 재료(true), 회차, 조용히)).toEqual({ reason: 'NO_CASE', 앞말: ['RUNNER_NO_PROCEDURE'] });
    가짜.createRun.mockRejectedValueOnce(new RunInputError('NO_ITEMS', '이 애플리케이션 플랫폼으로 실행할 케이스가 없다'));
    expect(await 줄돌리기(기능전체, 고름, 재료(true), 회차, 조용히)).toEqual({ reason: 'NO_ITEMS: 이 애플리케이션 플랫폼으로 실행할 케이스가 없다' });
  });
});
