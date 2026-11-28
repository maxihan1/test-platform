// 게임플레이 진행 조건 — 시뮬 줄 · 이김 · 입력 해시 · 끝 웨이브 · 다시 돌리기 · 따라갈 순서 · 손 시간 · 행동기록 · 재현 · 기계가 넣는 기대 · 시뮬불가
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 시뮬, 줄초안 } from './authoring-game-calc.js';
import { 곳글, 곳셈, 남은깰곳, 놀이막기 } from './authoring-learn-play.js';
import { 시뮬막기, 시뮬불가검사, 시뮬불가재현 } from './authoring-learn-sim.js';

let 자료: string;
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'learn-sim-'));
  mkdirSync(join(자료, 'game-calc'));
  mkdirSync(join(자료, 'game-play'));
  writeFileSync(join(자료, 'game-build-data.json'), JSON.stringify({ PlaceData: { Radius: 0.5 } }));
});
afterEach(() => rmSync(자료, { recursive: true, force: true }));

const 곳 = 'stage:시험';
const 웨 = (보스 = false) => ({ ...(보스 ? { 보스: true } : {}), 쉬는초: 1, 출현: [{ 종류: '슬라임', 수: 1, 간격: 0, 길: '가' }] });
const 입력 = (덧: Record<string, unknown> = {}): Record<string, unknown> => ({
  계산: '시뮬', 곳,
  지킬것: { 체력: 5, 자리: [10, 0] },
  길: { 가: [[0, 0], [10, 0]] },
  적종류: [{ 이름: '슬라임', 체력: 10, 속도: 1, 닿으면피해: 5, 보상: 1 }],
  웨이브: [웨(), 웨(), 웨(true)],
  설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 5, 간격: 2 }] }],
  설치물둘레: { 반경: 0.5, 근거: '빌드 데이터:PlaceData' },
  자리후보: [[5, 1]],
  캐릭터: { 자리: [5, 1], 걷기속도: 1 },
  재화: { 시작: 0 },
  볼값연결: { 웨이브: '웨이브', 지킬것: '세계수' },
  정책: [{ 조건: [], 행동: { 무엇: '놓기', 대상: '탑' } }],
  ...덧,
});
type 줄 = { kind: string; key: string; learned: { text: string; belief: string; data: Record<string, unknown> } | null };
const 줄 = (kind: string, key: string, data: Record<string, unknown>): 줄 => ({ kind, key, learned: { text: 'ㄱ', belief: 'GUESS', data } });
const 곳줄 = (data: Record<string, unknown> = {}) => 줄('STAGE', 곳, { 맵: { 적: { 주소: '/s', 값: [[0, 0]], 본때: 'a' } }, ...data });
const 계획줄 = 줄('TRIAL', 'trial:가', { 곳 });

/** 입력 파일을 쓰고 계산기로 돌려 지도에 적을 CALC 줄을 만든다 */
function 계산줄(이름: string, x: Record<string, unknown>): 줄 {
  const 경로 = join(자료, 'game-calc', `${이름}.json`);
  const 글 = JSON.stringify(x);
  writeFileSync(경로, 글);
  const r = 시뮬(x, { 경로, 글 });
  if ('틀림' in r) throw new Error(r.틀림);
  return 줄초안({ ...r, 이름 }, x) as unknown as 줄;
}
const 지도쓰기 = (들: 줄[]): void => {
  writeFileSync(join(자료, 'game-map.txt'), '');
  writeFileSync(join(자료, 'game-learned.json'), JSON.stringify({ elements: 들.map((x) => ({ ...x, name: x.key })) }));
};
const 계획 = { 곳, 쓸것: ['calc:가'], 볼값: [{ 이름: '웨이브', 주소: '/w' }, { 이름: '세계수', 주소: '/t' }] };
const 정책 = (c: 줄): unknown => (c.learned!.data.결과 as { 정책: unknown }).정책;
const 판쓰기 = (이름: string, 행동기록: unknown[], 계산: Record<string, string>, 어긋남: unknown = null, 웨이브 = 3, 때: unknown[] = [{ 초: 0, 값: { 웨이브: 1 } }, { 초: 2, 값: { 웨이브 } }]): void =>
  writeFileSync(join(자료, 'game-play', `${이름}.json`), JSON.stringify({ 값: { 이김: false }, 따라감: { 행동기록, 다시계산: [] }, 값기록: { 계획: 'trial:가', 볼값: [], 간격ms: 2000, 때, 어긋남, 화면다름: [], 계산 } }));
const 막기 = (계: typeof 계획, 들: 줄[], 자: string, 기: Parameters<typeof 시뮬막기>[3]) => 시뮬막기(계, 들 as never, 자, 기);
// 재현 시뮬은 7.5초에 놓은 탑이 슬라임을 한 번만 때려 10초쯤 세계수 5 를 다 잃고 진다
const 늦게놓음 = [{ 초: 0, 행동: '놓기', 대상: '탑', 자리: [5, 1], 도착초: 6, 끝초: 7.5 }];
const 세계수때 = (끝초: number, 진초: number) => Array.from({ length: 끝초 / 2 + 1 }, (_, i) => ({ 초: i * 2, 값: { 웨이브: 1, 세계수: i * 2 >= 진초 ? 0 : 5 } }));
const 기록들 = async () => (await import('./authoring-learn-check.js')).판기록들(자료);

describe('시뮬로 이기는 안이 있어야 판이 돈다', () => {
  it('이긴 시뮬 줄 · 같은 입력이면 웨이브마다 기대와 조작 도우미가 따라갈 순서를 내고, 시뮬 줄이 없으면 막는다', async () => {
    const c = 계산줄('가', 입력());
    const 들 = [곳줄(), 계획줄, c];
    expect(막기({ ...계획, 쓸것: [] }, 들, 자료, [])).toMatchObject({ 막음: expect.stringContaining('시뮬레이션으로 이기는 안이 있어야') });
    const r = 막기(계획, 들, 자료, await 기록들());
    expect(r).toMatchObject({ 기대: [1, 2, 3].map((k) => ({ 값: '세계수', 비교: '>=', 기준: 4, 부터: { 값: '웨이브', 기준: k }, 까지: { 값: '웨이브', 기준: k } })), 따라갈: { 정책: 정책(c), 버금: expect.any(Array), 모델: { 곳, 손: { 행동초: 0.5 } } } });
    expect(막기(계획, [곳줄({ 맵: { 적: { 없음: '적이 안 온다' } } }), 계획줄], 자료, [])).toBeNull();
  });

  it('이기는 안이 없다고 나온 줄 · 입력이 바뀐 줄 · 줄 글자만 이김으로 고친 줄은 막는다', () => {
    const 짐 = 계산줄('가', 입력({ 지킬것: { 체력: 4, 자리: [10, 0] }, 설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 1, 간격: 2 }] }] }));
    expect(막기(계획, [곳줄(), 계획줄, 짐], 자료, [])).toMatchObject({ 막음: expect.stringContaining('이기는 안이 없다') });
    const 고친 = { ...짐, learned: { ...짐.learned!, data: { ...짐.learned!.data, 결과: { ...(짐.learned!.data.결과 as object), 이김: true } } } };
    expect(막기(계획, [곳줄(), 계획줄, 고친], 자료, [])).toMatchObject({ 막음: expect.stringContaining('다시 돌리니') });
    const 이김줄 = 계산줄('가', 입력());
    const 손지어냄 = 입력({ 손: { 행동초: 9 } });
    const 느림 = 계산줄('가', 손지어냄);
    expect(느림.learned!.data.결과).toMatchObject({ 이김: false });
    const 빠른손 = { ...느림, learned: { ...느림.learned!, data: { ...느림.learned!.data, 결과: { ...(이김줄.learned!.data.결과 as object) } } } };
    expect(막기(계획, [곳줄(), 계획줄, 빠른손], 자료, [])).toMatchObject({ 막음: expect.stringContaining('다시 돌리니') });
    const 지은정책 = [{ 조건: [], 행동: { 무엇: '놓기', 대상: '탑' } }, { 조건: [], 행동: { 무엇: '줍기' } }];
    const 정책바꿈 = { ...이김줄, learned: { ...이김줄.learned!, data: { ...이김줄.learned!.data, 결과: { ...(이김줄.learned!.data.결과 as object), 정책: 지은정책 } } } };
    writeFileSync(join(자료, 'game-calc', '가.json'), JSON.stringify(입력()));
    expect(막기(계획, [곳줄(), 계획줄, 정책바꿈], 자료, [])).toMatchObject({ 막음: expect.stringContaining('입력 파일의 규칙으로 만든 것이 아니다') });
    const c = 계산줄('가', 입력());
    writeFileSync(join(자료, 'game-calc', '가.json'), JSON.stringify(입력({ 재화: { 시작: 1 } })));
    expect(막기(계획, [곳줄(), 계획줄, c], 자료, [])).toMatchObject({ 막음: expect.stringContaining('바뀌었다') });
  });

  it('끝 웨이브 · 보스까지 넣어야 한다 — 보스가 없으면 STAGE 끝웨이브 수만큼', () => {
    const 보스없음 = 계산줄('가', 입력({ 웨이브: [웨(), 웨()] }));
    expect(막기(계획, [곳줄(), 계획줄, 보스없음], 자료, [])).toMatchObject({ 막음: expect.stringContaining('보스 웨이브') });
    expect(막기(계획, [곳줄({ 끝웨이브: { 수: 2, 출처: '빌드 데이터' } }), 계획줄, 보스없음], 자료, [])).toHaveProperty('기대');
    expect(막기(계획, [곳줄({ 끝웨이브: { 수: 6, 출처: '빌드 데이터' } }), 계획줄, 보스없음], 자료, [])).toMatchObject({ 막음: expect.stringContaining('끝웨이브 6') });
  });

  it('판을 하나 더 돌면 그 판 손 시간으로 다시 시뮬해야 하고, 판에 행동기록이 없으면 막는다', async () => {
    const c = 계산줄('가', 입력());
    지도쓰기([곳줄(), 계획줄, c]);
    판쓰기('20261128000000000-판', [{ 초: 0, 행동: '놓기', 대상: '탑', 자리: [5, 1], 도착초: 0, 끝초: 1.5 }], { 'calc:가': JSON.stringify(c.learned!.data) });
    expect(막기(계획, [곳줄(), 계획줄, c], 자료, await 기록들())).toMatchObject({ 막음: expect.stringContaining('다시 안 돌렸다') });
    const 다시 = 계산줄('가', 입력());
    expect((다시.learned!.data.결과 as { 손: unknown }).손).toEqual({ 행동초: 1.5, 기록: '20261128000000000-판' });
    expect(막기(계획, [곳줄(), 계획줄, 다시], 자료, await 기록들())).toHaveProperty('기대');
    판쓰기('20261128000100000-판', [], { 'calc:가': JSON.stringify(다시.learned!.data) });
    expect(막기(계획, [곳줄(), 계획줄, 다시], 자료, await 기록들())).toMatchObject({ 막음: expect.stringContaining('에 행동기록이 없다') });
  });

  it('행동기록은 조작 도우미가 남긴 것(따라감)을 먼저 읽고, 버금 순서는 입력 규칙으로 만든 것만 따라갈 것에 싣는다', async () => {
    const { 판행동기록, 행동기록읽기 } = await import('./authoring-game-sim-run.js');
    const 옛 = [{ 초: 0, 행동: '놓기', 대상: '탑', 자리: [5, 1], 끝초: 1 }];
    const 새 = [{ 초: 0, 행동: '줍기', 자리: [8, 1], 자리들: [[6, 1], [8, 1]], 시작초: 0.2, 도착초: 2, 끝초: 2, 됨: true, 걸음: 3 }];
    expect(행동기록읽기({ 이름: 'ㄱ', 값: { 행동기록: 옛 } })).toEqual(옛);
    expect(행동기록읽기({ 이름: 'ㄱ', 값: { 행동기록: 옛 }, 따라감: { 행동기록: 새 } })).toEqual(새);
    expect(행동기록읽기({ 이름: 'ㄱ', 값: { 이김: true } })).toBeNull();
    // 시간 한도를 넘어 이어 한 판은 앞 기록의 행동부터 읽는다
    const 이은판들 = [{ 이름: '20261128000000000-판', 따라감: { 행동기록: 옛 } }, { 이름: '20261128000700000-판', 따라감: { 행동기록: 새, 이어: '20261128000000000-판' } }];
    expect(판행동기록(이은판들, 이은판들[1]!)!.map((x) => x.행동)).toEqual(['놓기', '줍기']);
    expect(판행동기록(이은판들, 이은판들[0]!)!.map((x) => x.행동)).toEqual(['놓기']);
    const c = 계산줄('가', 입력());
    const 놓기 = { 조건: [], 행동: { 무엇: '놓기', 대상: '탑' } };
    const 버금넣음 = { ...c, learned: { ...c.learned!, data: { ...c.learned!.data, 결과: { ...(c.learned!.data.결과 as object), 버금: [[놓기], [{ 조건: [], 행동: { 무엇: '줍기' } }], '틀린 것'] } } } };
    expect(막기(계획, [곳줄(), 계획줄, 버금넣음], 자료, [])).toMatchObject({ 따라갈: { 버금: [[놓기]] } });
  });

  it('설치물둘레 근거도 지도 · 빌드 데이터에 없으면 받지 않고, 빌드 데이터 근거는 지도 없이도 본다', () => {
    const 경로 = join(자료, 'game-calc', '둘레.json');
    const 둘레입력 = (근거: string) => 입력({ 설치물둘레: { 반경: 1.8, 근거 } });
    const 글 = (x: Record<string, unknown>) => (writeFileSync(경로, JSON.stringify(x)), JSON.stringify(x));
    expect(시뮬(둘레입력('빌드 데이터:PlaceData'), { 경로, 글: 글(둘레입력('빌드 데이터:PlaceData')) })).not.toHaveProperty('틀림');
    expect(시뮬(둘레입력('rule:식물 둘레'), { 경로, 글: 글(둘레입력('rule:식물 둘레')) })).toMatchObject({ 틀림: expect.stringContaining('지도를 못 읽어') });
    지도쓰기([곳줄(), 계획줄, 줄('RULE', 'rule:식물 둘레', { 곳 })]);
    expect(시뮬(둘레입력('rule:식물 둘레'), { 경로, 글: 글(둘레입력('rule:식물 둘레')) })).not.toHaveProperty('틀림');
    expect(시뮬(둘레입력('rule:없는 줄'), { 경로, 글: 글(둘레입력('rule:없는 줄')) })).toMatchObject({ 틀림: expect.stringContaining('설치물둘레 근거 rule:없는 줄') });
    rmSync(join(자료, 'game-build-data.json'));
    expect(시뮬(둘레입력('빌드 데이터:PlaceData'), { 경로, 글: 글(둘레입력('빌드 데이터:PlaceData')) })).toMatchObject({ 틀림: expect.stringContaining('잰 값의 출처가 아니다') });
  });

  it('유지 근거가 지도에 없는 열쇠면 계산이 받지 않는다 — 지침 예시 숫자를 베낀 값을 막는다(16102)', () => {
    const 유지입력 = (근거: string) => 입력({ 설치물종류: [{ 이름: '탑', 유지: { 체력: 50, 초당감소: 0.01, 다하면: '멈춤', 근거 }, 레벨: [{ 값: 0, 사거리: 3, 공격력: 5, 간격: 2 }] }] });
    지도쓰기([곳줄(), 계획줄, 줄('RULE', 'rule:식물 유지', { 곳 })]);
    const 경로 = join(자료, 'game-calc', '유.json');
    const 글 = (x: Record<string, unknown>) => (writeFileSync(경로, JSON.stringify(x)), JSON.stringify(x));
    expect(시뮬(유지입력('rule:없는 줄'), { 경로, 글: 글(유지입력('rule:없는 줄')) })).toMatchObject({ 틀림: expect.stringContaining('rule:없는 줄') });
    expect(시뮬(유지입력('rule:식물 유지'), { 경로, 글: 글(유지입력('rule:식물 유지')) })).not.toHaveProperty('틀림');
    expect(시뮬(유지입력(곳), { 경로, 글: 글(유지입력(곳)) })).toMatchObject({ 틀림: expect.stringContaining('잰 값의 출처가 아니다') });
    writeFileSync(join(자료, 'game-build-data.json'), JSON.stringify({ PlantData: { Upkeep: 50 }, PlaceData: { Radius: 0.5 } }));
    expect(시뮬(유지입력('빌드 데이터:PlantData'), { 경로, 글: 글(유지입력('빌드 데이터:PlantData')) })).not.toHaveProperty('틀림');
    expect(시뮬(유지입력('빌드 데이터:없는타입'), { 경로, 글: 글(유지입력('빌드 데이터:없는타입')) })).toMatchObject({ 틀림: expect.any(String) });
  });

  it('판에서 깬 적이 있는 곳의 진 시뮬 줄은 시뮬불가가 아니라 「값을 다시 재라」로 막는다(16102 첫 맵)', () => {
    const 결과 = { 주소: '/결과', 깸: '승리', 짐: '패배' };
    const 짐 = 계산줄('가', 입력({ 지킬것: { 체력: 4, 자리: [10, 0] }, 설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 1, 간격: 2 }] }] }));
    const 들 = [곳줄({ 결과 }), 계획줄, 짐];
    expect(막기(계획, 들, 자료, [])).toMatchObject({ 막음: expect.stringContaining('다음 맵으로 간다') });
    writeFileSync(join(자료, 'game-play', '20261127000000000-판.json'), JSON.stringify({ 값기록: { 계획: 'trial:가', 볼값: [], 간격ms: 2000, 때: [], 어긋남: null, 화면다름: [] }, 끝글: [{ 주소: '/결과', 경로: '', 글: '승리' }] }));
    expect(막기(계획, 들, 자료, [])).toMatchObject({ 막음: expect.stringContaining('1판 깬 적이 있다') });
  });

  it('판에 못 들어간 계획 판(행동기록이 비고 값이 한 번도 안 움직임)은 마지막 판으로 안 쳐 그 곳을 잠그지 않는다(16100 첫 맵 · 둘째 맵)', async () => {
    const c = 계산줄('가', 입력());
    지도쓰기([곳줄(), 계획줄, c]);
    판쓰기('20261128000000000-판', [{ 초: 0, 행동: '놓기', 대상: '탑', 자리: [5, 1], 도착초: 0, 끝초: 1.5 }], { 'calc:가': JSON.stringify(c.learned!.data) });
    const 다시 = 계산줄('가', 입력());
    판쓰기('20261128000100000-정책판', [], { 'calc:가': JSON.stringify(다시.learned!.data) }, null, 1);
    expect(막기(계획, [곳줄(), 계획줄, 다시], 자료, await 기록들())).toHaveProperty('기대');
  });

  it('앞 판을 재현해 매 순간 판과 맞으면 기대가 깨진 판이어도 다음 판이 돈다(재현 칸을 안 넣어도)', async () => {
    const c = 계산줄('가', 입력());
    지도쓰기([곳줄(), 계획줄, c]);
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(c.learned!.data) }, { 초: 10, 값이름: '세계수', 값: 0, 기대: '세계수 >= 4' }, 1, 세계수때(10, 10));
    expect(막기(계획, [곳줄(), 계획줄, 계산줄('가', 입력())], 자료, await 기록들())).toHaveProperty('기대');
    const 재현 = 계산줄('가', 입력({ 재현: { 기록: '20261128000000000-판' } }));
    expect(재현.learned!.data.결과).toMatchObject({ 재현: { 이김: false, 웨이브수: 0, 맞음: true } });
  });

  it('재현이 판과 어긋나면 처음 어긋난 값 · 때 · 고칠 곳을 보여 주며 막는다 — 판은 30초를 버텼는데 재현은 10초에 진다', async () => {
    const c = 계산줄('가', 입력());
    지도쓰기([곳줄(), 계획줄, c]);
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(c.learned!.data) }, null, 1, 세계수때(30, 99));
    const r = 막기(계획, [곳줄(), 계획줄, 계산줄('가', 입력())], 자료, await 기록들());
    expect(r).toMatchObject({ 막음: expect.stringContaining('판 20261128000000000-판 을 재현하니 판과 어긋난다 — 10초 판 길이') });
    expect(r).toMatchObject({ 막음: expect.stringContaining('시뮬은 10초에 져 끝났는데 판은 30초까지 돌았다') });
    expect(r).toMatchObject({ 막음: expect.stringContaining('고칠 곳: 적종류(체력') });
    const 재현 = 계산줄('가', 입력({ 재현: { 기록: '20261128000000000-판' } }));
    expect(재현.learned!.data.결과).toMatchObject({ 재현: { 맞음: false, 어긋남: { 초: 10, 값: '끝' } } });
    expect(재현.learned!.text).toContain('판과 어긋남(10초 끝)');
  });

  it('판 값기록을 시뮬과 못 이으면(볼값 이름이 다르다) 어긋난 판만 재현 칸과 웨이브 수로 견준다', async () => {
    const c = 계산줄('가', 입력());
    지도쓰기([곳줄(), 계획줄, c]);
    const 어긋남 = { 초: 12, 값이름: '나무', 값: 0, 기대: '나무 >= 4' };
    const 다른이름 = [{ 초: 0, 값: { 나무: 5 } }, { 초: 2, 값: { 나무: 5 } }];
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(c.learned!.data) }, 어긋남, 1, 다른이름);
    expect(막기(계획, [곳줄(), 계획줄, 계산줄('가', 입력())], 자료, await 기록들())).toMatchObject({ 막음: expect.stringContaining('재현: { 기록: "20261128000000000-판" }') });
    const 맞춤 = 계산줄('가', 입력({ 재현: { 기록: '20261128000000000-판' } }));
    expect(맞춤.learned!.data.결과).toMatchObject({ 재현: { 이김: false, 웨이브수: 0 } });
    expect(맞춤.learned!.data.결과).not.toHaveProperty('재현.맞음');
    expect(막기(계획, [곳줄(), 계획줄, 맞춤], 자료, await 기록들())).toHaveProperty('기대');
  });
});

describe('시뮬불가 — 판 없이 넘기고 다른 맵을 다 돈 뒤 한 번 다시 본다', () => {
  const 결과 = { 주소: '/결과', 깸: '승리', 짐: '패배' };
  const 불가곳 = (짐: 줄, 다시봄?: true) => 곳줄({ 결과, 시뮬불가: { 계산: 짐.key, 웨이브: '1웨이브', 모자람: '초당 피해 3 모자람', ...(다시봄 ? { 다시봄 } : {}) } });

  it('시뮬불가는 그 곳 판이 있으면 그 판을 재현해 맞는 모델로만 받는다 — 검사 안 받은 시뮬이 판에서 버틴 맵을 1웨이브에 진다고 닫았다(16104 넷째~여덟째)', async () => {
    const 짐 = 계산줄('가', 입력({ 지킬것: { 체력: 4, 자리: [10, 0] }, 설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 1, 간격: 2 }] }] }));
    const 들 = [불가곳(짐), 계획줄, 짐];
    expect(시뮬불가재현(곳, 불가곳(짐).learned!.data, 들 as never, 자료, [])).toBeNull();
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(짐.learned!.data) }, null, 1, 세계수때(30, 99));
    expect(시뮬불가재현(곳, 불가곳(짐).learned!.data, 들 as never, 자료, await 기록들())).toContain('시뮬불가는 판과 맞는 모델로만 받는다 — 판 20261128000000000-판 을 재현하니 판과 어긋난다 — 10초 판 길이');
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(짐.learned!.data) }, null, 1, 세계수때(10, 10));
    expect(시뮬불가재현(곳, 불가곳(짐).learned!.data, 들 as never, 자료, await 기록들())).toBeNull();
  });

  it('적는 명령은 그 곳의 진 시뮬 줄을 가리켜야 받는다', () => {
    const 짐 = 계산줄('가', 입력({ 지킬것: { 체력: 4, 자리: [10, 0] }, 설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 1, 간격: 2 }] }] }));
    const 이김 = 계산줄('나', 입력());
    const 찾기 = (k: string) => [짐, 이김].find((x) => x.key === k) as never;
    expect(시뮬불가검사(곳, 불가곳(짐).learned!.data, 찾기)).toBeNull();
    expect(시뮬불가검사(곳, 불가곳(짐).learned!.data, 찾기, 2)).toContain('판에서 2판 깬 적이 있다');
    expect(시뮬불가검사(곳, 불가곳(이김).learned!.data, 찾기)).toContain('이기는 안이 있다');
    expect(시뮬불가검사('stage:다른', 불가곳(짐).learned!.data, 찾기)).toContain('시뮬 CALC 줄이 아니다');
    expect(시뮬불가검사(곳, { 시뮬불가: { 계산: 'calc:가' } }, 찾기)).toContain('data.시뮬불가 는');
    expect(시뮬불가검사(곳, { 끝웨이브: { 수: 6 } }, 찾기)).toContain('data.끝웨이브');
  });

  it('다른 깰 곳이 남았으면 넘긴 곳 계획을 막고, 다 돌았으면 다시 시뮬 남은 곳으로 열고, 다시봄이면 닫는다', () => {
    const 짐 = 계산줄('가', 입력({ 지킬것: { 체력: 4, 자리: [10, 0] } }));
    const 다른 = 줄('STAGE', 'stage:다른', { 결과 });
    const 들 = [불가곳(짐), 다른, 계획줄, 짐];
    expect(남은깰곳(들 as never, [])).toEqual(['아직 못 깬 곳 1(stage:다른 0판)']);
    expect(놀이막기({ 곳, 쓸것: ['calc:가'] }, 들 as never, [])).toContain('다른 맵을 다 돈 뒤에');
    const 깬다른 = 줄('STAGE', 'stage:다른', { 결과, 상태: '못깸', 까닭: 'ㄱ' });
    const 다돎 = [불가곳(짐), 깬다른, 계획줄, 짐];
    expect(남은깰곳(다돎 as never, [])).toEqual([expect.stringContaining('다시 시뮬 남은 곳 1(stage:시험)')]);
    expect(놀이막기({ 곳, 쓸것: ['calc:가', `${곳}#적`] }, 다돎 as never, [])).toBeNull();
    const 닫음 = [불가곳(짐, true), 깬다른, 계획줄, 짐];
    expect(남은깰곳(닫음 as never, [])).toEqual([]);
    expect(놀이막기({ 곳, 쓸것: ['calc:가'] }, 닫음 as never, [])).toContain('다시 시뮬해도');
    expect(곳글(곳셈(닫음 as never, []).find((x) => x.열쇠 === 곳)!)).toBe('stage:시험 시뮬레이션상 불가(1웨이브 · 초당 피해 3 모자람 · 다시 봐도 불가)');
  });

  it('열 판을 해 보고 시뮬불가로 넘긴 곳은 정보 모으기 남은 곳에 묶이지 않고 다시 시뮬 남은 곳으로 열린다', () => {
    const 짐 = 계산줄('가', 입력({ 지킬것: { 체력: 4, 자리: [10, 0] } }));
    const 판들 = Array.from({ length: 10 }, (_, i) => ({ 이름: `2026112800000${i}000-판`, 값기록: { 계획: 'trial:가', 볼값: [], 간격ms: 2000, 때: [], 어긋남: null, 화면다름: [] }, 끝글: [{ 주소: '/결과', 경로: '', 글: '패배' }] }));
    const 들 = [불가곳(짐), 줄('STAGE', 'stage:다른', { 결과, 상태: '못깸', 까닭: 'ㄱ' }), 계획줄, 짐];
    expect(곳셈(들 as never, 판들).find((x) => x.열쇠 === 곳)).toMatchObject({ 판: 10, 깸: 0 });
    expect(남은깰곳(들 as never, 판들)).toEqual([expect.stringContaining('다시 시뮬 남은 곳 1(stage:시험)')]);
  });
});
