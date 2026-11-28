// 게임플레이 진행 조건의 재현 비교 · 숫자 맞추기 · 게임 세계 코드 — 앞 판 재현이 매 순간 맞아야 다음 판 · 시뮬불가 받기 · 맞춘 값 · 세계 파일 해시
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { 기본세계글 } from '@platform/kit/gameplay';

import { 순서자료, 시뮬 } from './authoring-game-calc.js';
import { 세계넣기 } from './authoring-game-sim-run.js';
import { 시뮬불가검사, 시뮬불가재현 } from './authoring-learn-sim.js';
import { 계산줄, 계획, 계획줄, 곳, 곳줄, 기록들, 늦게놓음, 막기, 세계수때, 입력, 자료, 줄, 지도쓰기, 판쓰기 } from './authoring-learn-sim-fake.js';

describe('앞 판 재현이 매 순간 맞아야 다음 판이 돈다', () => {
  it('앞 판을 재현해 매 순간 판과 맞으면 기대가 깨진 판이어도 다음 판이 돈다(재현 칸을 안 넣어도)', async () => {
    const c = 계산줄('가', 입력());
    지도쓰기([곳줄(), 계획줄, c]);
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(c.learned!.data) }, { 초: 10, 값이름: '세계수', 값: 0, 기대: '세계수 >= 4' }, 1, 세계수때(10, 10));
    expect(막기(계획, [곳줄(), 계획줄, 계산줄('가', 입력())], 자료, await 기록들())).toHaveProperty('기대');
    const 재현 = 계산줄('가', 입력({ 재현: { 기록: '20261128000000000-판' } }));
    expect(재현.learned!.data.결과).toMatchObject({ 재현: { 이김: false, 웨이브수: 0, 맞음: true } });
  });

  it('앞 판에서 판 함수 적() 이 화면 밖 적을 못 읽었으면(조작 도우미가 남긴 적못봄) 재현보다 먼저 막고 판 함수를 고치라고 한다 — 16105 첫 맵', async () => {
    const c = 계산줄('가', 입력());
    지도쓰기([곳줄(), 계획줄, c]);
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(c.learned!.data) }, null, 1, 세계수때(10, 10), { 적못봄: { 초: 96, 남은적: 1, 이어진초: 15.2 } });
    expect(막기(계획, [곳줄(), 계획줄, 계산줄('가', 입력())], 자료, await 기록들())).toMatchObject({ 막음: expect.stringContaining('96초부터 웨이브 중 남은 적 1 인데 판 함수 적() 이 15.2초 넘게 0 을 돌려줬다') });
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

  it('맞추기에 적은 못 잰 값은 그 곳 판들의 재현에 맞춰 줄에 싣고, 게이트는 그 값을 범위 안일 때만 넣어 따라갈 모델을 만든다', async () => {
    const 맞출입력 = 입력({ 재화: { 시작: 0, 초당: 0 }, 볼값연결: { 웨이브: '웨이브', 지킬것: '세계수', 재화: '고기' }, 맞추기: { '재화.초당': [0, 3] } });
    const c = 계산줄('가', 맞출입력);
    지도쓰기([곳줄(), 계획줄, c]);
    // 판에서는 고기가 초당 1 씩 올랐고 10초에 졌다
    const 때 = Array.from({ length: 6 }, (_, i) => ({ 초: i * 2, 값: { 웨이브: 1, 세계수: i * 2 >= 10 ? 0 : 5, 고기: i * 2 } }));
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(c.learned!.data) }, null, 1, 때);
    const 맞춘 = 계산줄('가', 맞출입력);
    const 값 = (맞춘.learned!.data.결과 as { 맞춘값: Record<string, number> }).맞춘값['재화.초당']!;
    expect(Math.abs(값 - 1)).toBeLessThan(0.1);
    expect(맞춘.learned!.data.결과).toMatchObject({ 맞추기: { 판: ['20261128000000000-판'], 빠짐: [] } });
    expect(막기(계획, [곳줄(), 계획줄, 맞춘], 자료, await 기록들())).toMatchObject({ 따라갈: { 모델: { 재화: { 초당: 값 } } } });
    const 고친 = { ...맞춘, learned: { ...맞춘.learned!, data: { ...맞춘.learned!.data, 결과: { ...(맞춘.learned!.data.결과 as object), 맞춘값: { '재화.초당': 9 } } } } };
    expect(막기(계획, [곳줄(), 계획줄, 고친], 자료, await 기록들())).toMatchObject({ 막음: expect.stringContaining('범위 밖') });
  });

  it('게임 세계 코드 파일을 입력의 세계로 읽어 계산하고, 줄을 낸 뒤 그 파일이 바뀌면 게이트가 막는다 · 케이스 순서자료에는 글로 싣는다', async () => {
    const 세계파일 = join(자료, 'game-calc', 'w.world.js');
    writeFileSync(세계파일, 기본세계글.replace('else 재화 += 보상;', 'else 재화 += 보상 * 2;'));
    const c = 계산줄('가', 입력({ 세계: 'w.world.js' }));
    expect(c.learned!.data.입력).toMatchObject({ 세계: { 파일: 'w.world.js', 해시: expect.any(String) } });
    지도쓰기([곳줄(), 계획줄, c]);
    expect(막기(계획, [곳줄(), 계획줄, c], 자료, [])).toHaveProperty('기대');
    writeFileSync(세계파일, 기본세계글);
    expect(막기(계획, [곳줄(), 계획줄, c], 자료, [])).toMatchObject({ 막음: expect.stringContaining('게임 세계 코드(w.world.js)가 바뀌었다') });
    const 경로 = join(자료, 'game-calc', '나.json');
    expect(시뮬(입력({ 세계: '../w.world.js' }), { 경로, 글: '{}' })).toMatchObject({ 틀림: expect.stringContaining('폴더를 넘나들지') });
    const 넣음 = 세계넣기(입력({ 세계: 'w.world.js' }), join(자료, 'game-calc'));
    if ('틀림' in 넣음) throw new Error(넣음.틀림);
    const r = 시뮬(입력({ 세계: 'w.world.js' }), { 경로, 글: JSON.stringify(입력({ 세계: 'w.world.js' })) });
    if ('틀림' in r) throw new Error(r.틀림);
    expect(순서자료(r, 넣음.입력)).toMatchObject({ 입력: { 세계글: 기본세계글 } });
    expect(순서자료(r, 넣음.입력)!.입력).not.toHaveProperty('세계');
  });

  it('세계 파일이 없으면 본보기 세계의 해시를 줄에 남겨, 본보기 세계가 바뀐 뒤에는 게이트가 옛 줄을 막는다', () => {
    const c = 계산줄('가', 입력());
    expect(c.learned!.data.입력).toMatchObject({ 세계: { 파일: '본보기 세계', 해시: expect.any(String) } });
    지도쓰기([곳줄(), 계획줄, c]);
    expect(막기(계획, [곳줄(), 계획줄, c], 자료, [])).toHaveProperty('기대');
    const 옛 = { ...c, learned: { ...c.learned!, data: { ...c.learned!.data, 입력: { ...(c.learned!.data.입력 as object), 세계: { 파일: '본보기 세계', 해시: '옛본보기' } } } } };
    expect(막기(계획, [곳줄(), 계획줄, 옛], 자료, [])).toMatchObject({ 막음: expect.stringContaining('게임 세계 코드(본보기 세계)가 바뀌었다') });
  });

  it('게임 세계 코드가 판 도중에 던지면 계산기는 어느 함수가 몇 초에 던졌는지 글로 돌려준다 — 계산기가 통째로 죽지 않는다', () => {
    writeFileSync(join(자료, 'game-calc', 'w.world.js'), 기본세계글.replace('    흘리기(t, 캐x, 캐z) {', "    흘리기(t, 캐x, 캐z) { if (t >= 5) throw new Error('5초 넘음');"));
    const 경로 = join(자료, 'game-calc', '나.json');
    const 글 = JSON.stringify(입력({ 세계: 'w.world.js' }));
    expect(시뮬(입력({ 세계: 'w.world.js' }), { 경로, 글 })).toMatchObject({ 틀림: '게임 세계 코드 흘리기 가 5초에 던졌다 — 5초 넘음' });
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

describe('시뮬불가는 판과 맞는 모델로만 받는다', () => {
  const 결과 = { 주소: '/결과', 깸: '승리', 짐: '패배' };
  const 불가곳 = (짐: 줄) => 곳줄({ 결과, 시뮬불가: { 계산: 짐.key, 웨이브: '1웨이브', 모자람: '초당 피해 3 모자람' } });

  it('시뮬불가는 그 곳 판이 있으면 그 판을 재현해 맞는 모델로만 받는다 — 검사 안 받은 시뮬이 판에서 버틴 맵을 1웨이브에 진다고 닫았다(16104 넷째~여덟째)', async () => {
    const 짐 = 계산줄('가', 입력({ 지킬것: { 체력: 4, 자리: [10, 0] }, 설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 1, 간격: 2 }] }] }));
    const 들 = [불가곳(짐), 계획줄, 짐];
    expect(시뮬불가재현(곳, 불가곳(짐).learned!.data, 들 as never, 자료, [])).toBeNull();
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(짐.learned!.data) }, null, 1, 세계수때(30, 99));
    expect(시뮬불가재현(곳, 불가곳(짐).learned!.data, 들 as never, 자료, await 기록들())).toContain('시뮬불가는 판과 맞는 모델로만 받는다 — 판 20261128000000000-판 을 재현하니 판과 어긋난다 — 10초 판 길이');
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(짐.learned!.data) }, null, 1, 세계수때(10, 10));
    expect(시뮬불가재현(곳, 불가곳(짐).learned!.data, 들 as never, 자료, await 기록들())).toBeNull();
    // 입력 파일이 없거나 줄을 낸 뒤 바뀌었으면 재현을 못 보니 받지 않는다
    writeFileSync(join(자료, 'game-calc', '가.json'), '{}');
    expect(시뮬불가재현(곳, 불가곳(짐).learned!.data, 들 as never, 자료, await 기록들())).toContain('입력 파일 game-calc/가.json 이 바뀌었다');
    rmSync(join(자료, 'game-calc', '가.json'));
    expect(시뮬불가재현(곳, 불가곳(짐).learned!.data, 들 as never, 자료, await 기록들())).toContain('입력 파일 game-calc/가.json 을 못 읽어 그 곳 판과 견주지 못한다');
  });

  it('행동기록이 없는 옛 판이라도 시뮬 최선이 진 때보다 지킬것을 더 오래 지켰으면 시뮬불가를 받지 않는다 — 16104 넷째 맵 시뮬 59.3초 · 판 79초', async () => {
    const 짐 = 계산줄('가', 입력({ 지킬것: { 체력: 4, 자리: [10, 0] }, 설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 1, 간격: 2 }] }] }));
    const 진초 = (짐.learned!.data.결과 as { 짐: { 초: number } }).짐.초;
    const 들 = [불가곳(짐), 계획줄, 짐];
    판쓰기('20261127000000000-옛판', [], { 'calc:가': JSON.stringify(짐.learned!.data) }, null, 1, 세계수때(40, 99));
    expect(시뮬불가재현(곳, 불가곳(짐).learned!.data, 들 as never, 자료, await 기록들())).toContain(`판 20261127000000000-옛판 은 1웨이브 40초까지 지킬것이 5 남았는데 시뮬 최선(calc:가)은 1웨이브 ${진초}초에 진다`);
    판쓰기('20261127000000000-옛판', [], { 'calc:가': JSON.stringify(짐.learned!.data) }, null, 1, 세계수때(40, 진초));
    expect(시뮬불가재현(곳, 불가곳(짐).learned!.data, 들 as never, 자료, await 기록들())).toBeNull();
  });

  it('고쳐도 재현이 안 맞으면 재현안맞음으로 닫는다 — 그 판 재현이 정말 어긋나야 받고, 이길 수 있는 계산이어도 받는다', async () => {
    const 이김 = 계산줄('가', 입력());
    const 안맞음 = (기록: string) => ({ 결과, 시뮬불가: { 계산: 이김.key, 웨이브: '1웨이브', 모자람: '재현이 판과 안 맞음(10초 판 길이)', 재현안맞음: 기록 } });
    const 들 = [곳줄(안맞음('20261128000000000-판')), 계획줄, 이김];
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(이김.learned!.data) }, null, 1, 세계수때(30, 99));
    const 찾기 = (k: string) => 들.find((x) => x.key === k) as never;
    expect(시뮬불가검사(곳, 안맞음('20261128000000000-판'), 찾기, 2)).toBeNull();
    expect(시뮬불가재현(곳, 안맞음('20261128000000000-판'), 들 as never, 자료, await 기록들())).toBeNull();
    expect(시뮬불가재현(곳, 안맞음('20261128009900000-없는판'), 들 as never, 자료, await 기록들())).toContain('이 곳(stage:시험)을 계획으로 돈 판 기록이 아니다');
    판쓰기('20261128000000000-판', 늦게놓음, { 'calc:가': JSON.stringify(이김.learned!.data) }, null, 1, 세계수때(10, 10));
    expect(시뮬불가재현(곳, 안맞음('20261128000000000-판'), 들 as never, 자료, await 기록들())).toContain('재현안맞음이 아니다');
  });
});
