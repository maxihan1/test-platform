// 지도 검증 · 회고 · 다음 해 보기 막기 · 끝 조건 · 계획 숫자 읽기 · 인수인계 — 다섯 번째 실측에서 틀리게 올라간 「확인」 두 줄을 판 기록으로 다시 걸어 본다
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 값읽기시작, 첫값유예ms, 화면다른것 } from './authoring-game-play-values.js';
import { 지도읽기 } from './authoring-game-find.js';
import { type 판기록, 계획읽기, 놀이계획검사, 대봄검사, 수로, 어긋난기대, 판기록들 } from './authoring-learn-check.js';
import { 합치기 } from './authoring-learn-note.js';
import { 남은배울것, 배움막기, 손막힘, 회고없는판, 회고채우기 } from './authoring-learn-retro.js';

let 자료 = '';
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'learn-check-'));
  mkdirSync(join(자료, 'game-play'));
});
afterEach(() => rmSync(자료, { recursive: true, force: true }));

const 결과창 = (이름: string, 결과: string, 최고: string): 판기록 => ({ 이름, 끝글: [{ 주소: 'ResultText', 경로: '/Canvas/ResultText', 글: 결과 }, { 주소: 'MyBestValue', 경로: '/Canvas/MyBestValue', 글: 최고 }] });
const 점수판 = (이름: string, 직접: number, 식물: number, 중간: number, 보스: number, 총: number): 판기록 => ({ 이름, 값: { 점수: { 직접, 식물, 중간, 보스, 총 } } });
const 줄 = (kind: string, key: string, data: object, belief = 'SEEN') => ({ kind, key, name: key, learned: { text: 'ㄱ', belief, data } });
const 계획data = { 볼값: [{ 이름: '세계수', 주소: '/Lumikantle', 칸: 'Lumikantle.HP', 화면: 'HpText' }, { 이름: '웨이브', 주소: 'WaveText' }], 기대: [{ 값: '세계수', 비교: '>=', 기준: 50, 까지: { 값: '웨이브', 기준: 1 } }], 목표: { 값: '웨이브', 기준: 6 }, 어디서: 'ask:첫 맵' };
const 값기록 = (계획: string, 때: { 초: number; 값: Record<string, number | null> }[], 어긋남: 판기록어긋남 | null = null): NonNullable<판기록['값기록']> => ({ 계획, 볼값: [], 간격ms: 2000, 때, 어긋남, 화면다름: [] });
type 판기록어긋남 = { 초: number; 값이름: string; 값: number; 기대: string };
const 기록쓰기 = (이름: string, 몸: object) => writeFileSync(join(자료, 'game-play', `${이름}.json`), JSON.stringify(몸));

describe('지도 검증 — 「확인」 줄은 판 기록 전부에서 값을 읽어 대 본다', () => {
  const 최고기록 = { 대봄: { 값: { 주소: 'MyBestValue' }, 조건: { 주소: 'ResultText' }, 기대: [{ 조건값: '패 배', 값: '--:--.--' }, { 조건값: '승 리', 값: { 아님: '--:--.--' } }] } };

  it('진 판이라 최고 기록이 안 남는다는 줄 — 이긴 29판 결과 창도 --:--.-- 라 걸린다', () => {
    const 기록들 = [결과창('20261126001000000-a', '패 배', '--:--.--'), 결과창('20261126002000000-b', '패 배', '--:--.--'), 결과창('20261126003600000-29판', '승 리', '--:--.--')];
    expect(대봄검사(최고기록, 기록들)).toEqual(['20261126003600000-29판 에서 ResultText "승 리" 인데 MyBestValue 이 "--:--.--" 이다(적은 것 "--:--.--" 아님)']);
  });

  it('다른 조건의 판 기록이 없으면 덜 봄이다 · 조건값마다 값이 같으면 그 조건은 까닭이 아니다', () => {
    const 진판만 = [결과창('20261126001000000-a', '패 배', '--:--.--')];
    expect(대봄검사(최고기록, 진판만)[0]).toContain('"승 리" 인 판 기록이 없다');
    const 같은값 = { 대봄: { ...최고기록.대봄, 기대: [{ 조건값: '패 배', 값: '--:--.--' }, { 조건값: '승 리', 값: '--:--.--' }] } };
    expect(대봄검사(같은값, [...진판만, 결과창('20261126003600000-29판', '승 리', '--:--.--')])).toEqual(['조건이 달라도 적은 값이 같다 — 그 조건은 까닭이 아니다']);
    expect(대봄검사({ 대봄: { ...최고기록.대봄, 기대: [최고기록.대봄.기대[0]] } }, 진판만)[0]).toContain('둘 이상');
  });

  it('조건이 없으면 「늘 이 값」 — 값이 든 판 둘 이상에서 다 같아야 한다', () => {
    const 늘 = { 대봄: { 값: { 주소: 'MyBestValue' }, 기대: [{ 값: '--:--.--' }] } };
    expect(대봄검사(늘, [결과창('20261126001000000-a', '패 배', '--:--.--')])[0]).toContain('1개다');
    expect(대봄검사(늘, [결과창('20261126001000000-a', '패 배', '--:--.--'), 결과창('20261126002000000-b', '승 리', '--:--.--')])).toEqual([]);
  });

  it('끝 화면 글자는 서식 태그를 떼고 적은 글과 비교한다 · 적은 글에 태그가 있어도 뗀다', () => {
    const 기록들 = ['a', 'b'].map((x) => 결과창(`2026112600100000${x === 'a' ? 0 : 1}-${x}`, '승 리', '<font-weight="600">6/6</font-weight>'));
    expect(대봄검사({ 대봄: { 값: { 주소: 'MyBestValue' }, 기대: [{ 값: '6/6' }] } }, 기록들)).toEqual([]);
    expect(대봄검사({ 대봄: { 값: { 주소: 'MyBestValue' }, 기대: [{ 값: '<b>6/6</b>' }] } }, 기록들)).toEqual([]);
  });

  it('네 항의 합 — 직접 처치 · 중간 보스가 0 아닌 판이 없어 걸린다', () => {
    const 셈 = { 대봄: { 셈: { 항: ['직접', '식물', '중간', '보스'].map((k) => ({ 돌려준: `점수.${k}` })), 합: { 돌려준: '점수.총' } } } };
    const 기록들 = [점수판('20261126001000000-1판', 0, 0, 0, 0, 0), 점수판('20261126002000000-2판', 0, 0, 0, 10, 10), 점수판('20261126003600000-29판', 0, 456, 0, 10, 466)];
    expect(대봄검사(셈, 기록들)).toEqual(['항 돌려준 점수.직접 이 0 아닌 판이 없다 — 더해진 적이 없는 항이다', '항 돌려준 점수.중간 이 0 아닌 판이 없다 — 더해진 적이 없는 항이다']);
    expect(대봄검사(셈, [...기록들, 점수판('20261126004000000-30판', 3, 1, 2, 0, 9)])[0]).toContain('30판 에서 항의 합 3+1+2+0 이 9 와 다르다');
    expect(대봄검사({}, 기록들)[0]).toContain('판 기록으로 대 볼 수 있어야 한다');
  });

  it('오브젝트 값은 2초 기록의 마지막 읽은 값으로 찾는다 · 판 기록은 json 만 이름순으로 읽는다', () => {
    기록쓰기('20261126002000000-b', { 값기록: { ...값기록('trial:가', [{ 초: 0, 값: { 피: 5 } }, { 초: 2, 값: { 피: null } }]), 볼값: [{ 이름: '피', 주소: '/P', 칸: 'Hp.v' }] } });
    기록쓰기('20261126001000000-a', { 값기록: { ...값기록('trial:가', [{ 초: 0, 값: { 피: 5 } }]), 볼값: [{ 이름: '피', 주소: '/P', 칸: 'Hp.v' }] } });
    writeFileSync(join(자료, 'game-play', '20261126001000000-a-새것.txt'), 'x');
    기록쓰기('20261126003000000-지켜보기-판', { 끝글: [] });
    const 들 = 판기록들(자료);
    expect(들.map((r) => r.이름)).toEqual(['20261126001000000-a', '20261126002000000-b']);
    expect(대봄검사({ 대봄: { 값: { 주소: '/P', 칸: 'Hp.v' }, 기대: [{ 값: 5 }] } }, 들)).toEqual([]);
  });
});

describe('계획 · 기대', () => {
  it('볼값 · 기대 · 목표가 다 있어야 계획이다', () => {
    expect(계획읽기(계획data)).toMatchObject({ 목표: { 값: '웨이브', 기준: 6 } });
    expect(계획읽기({ ...계획data, 기대: [] })).toContain('숫자로 못 적는 계획');
    expect(계획읽기({ ...계획data, 목표: undefined })).toContain('data.목표');
    expect(계획읽기({ ...계획data, 볼값: [...계획data.볼값, { 이름: '나아감', 주소: 'x' }] })).toContain('겹친다');
  });

  it('까지 · 부터 문이 열린 때만 본다', () => {
    const 기대들 = (계획읽기(계획data) as { 기대: Parameters<typeof 어긋난기대>[0] }).기대;
    expect(어긋난기대(기대들, { 세계수: 42, 웨이브: 1 })).toMatchObject({ 값: '세계수' });
    expect(어긋난기대(기대들, { 세계수: 42, 웨이브: 2 })).toBeNull();
    expect(어긋난기대(기대들, { 세계수: null, 웨이브: 1 })).toBeNull();
  });
});

describe('계획 숫자 읽기 — 2초마다 읽고 처음 어긋난 순간 사진 한 장', () => {
  it('처음 어긋난 때만 잡고 그때 찍는다 · 화면 글자와 절반 넘게 다르면 그 값을 짚는다', async () => {
    let 피 = 60;
    let 찍음 = 0;
    const 게임 = {
      get: async () => (피 -= 10),
      text: async (주소: string) => (주소 === 'HpText' ? '99' : '웨이브 1'),
      screenshot: async () => (찍음 += 1, Buffer.from('jpg')),
    };
    const 계획 = 계획읽기(계획data) as Exclude<ReturnType<typeof 계획읽기>, string>;
    const 고리 = 값읽기시작(게임 as never, 'trial:첫 맵', 계획.볼값, 계획.기대, Date.now(), 5);
    await new Promise((끝) => setTimeout(끝, 40));
    const r = await 고리.끝난다();
    expect(r.기록.어긋남).toMatchObject({ 값이름: '세계수', 값: 40, 기대: '세계수 >= 50 (웨이브 1 까지)' });
    expect(찍음).toBe(1);
    expect(r.사진?.toString()).toBe('jpg');
    expect(r.기록.화면다름).toEqual(['세계수']);
    expect(화면다른것([{ 초: 0, 값: { 가: 3 }, 화면: { 가: 3 } }], [{ 이름: '가', 주소: 'a', 칸: 'b', 화면: 'c' }])).toEqual([]);
  });

  it('첫 읽기 값이 안 바뀐 동안은 기대를 안 본다 — 앞 판 끝 화면(세계수 0)을 새 판 값으로 읽고 0초에 멈췄다(#16054 · #16058)', async () => {
    const 읽을값 = [0, 0, 0, 100, 90, 80, 70, 60];
    let 찍음 = 0;
    const 게임 = {
      get: async () => 읽을값.shift() ?? 60,
      text: async () => '',
      screenshot: async () => (찍음 += 1, Buffer.from('jpg')),
    };
    const 고리 = 값읽기시작(게임 as never, 'trial:첫 맵', [{ 이름: '세계수', 주소: '/Lumikantle', 칸: 'Lumikantle.HP' }], [{ 값: '세계수', 비교: '>=', 기준: 50 }], Date.now(), 5);
    await vi.waitFor(() => expect(고리.지금().때.length).toBeGreaterThanOrEqual(4));
    const r = await 고리.끝난다();
    expect(r.기록.때.slice(0, 4).map((x) => x.값.세계수)).toEqual([0, 0, 0, 100]);
    expect(r.기록.어긋남).toBeNull();
    expect(찍음).toBe(0);
  });

  it('값마다 따로 본다 — 웨이브가 먼저 바뀌어도 아직 앞 판 값인 세계수는 안 본다. 10초가 지나면 안 바뀐 값도 본다', async () => {
    const 볼값들 = [{ 이름: '세계수', 주소: '/Lumikantle', 칸: 'Lumikantle.HP' }, { 이름: '웨이브', 주소: '/Wave', 칸: 'Wave.Now' }];
    const 기대 = [{ 값: '세계수', 비교: '>=' as const, 기준: 50 }];
    let 웨이브 = 0;
    const 게임 = { get: async (_주소: string, 칸: string) => (칸 === 'Wave.Now' ? (웨이브 += 1) : 0), text: async () => '', screenshot: async () => Buffer.from('jpg') };
    const 막 = 값읽기시작(게임 as never, 'trial:첫 맵', 볼값들, 기대, Date.now(), 5);
    await vi.waitFor(() => expect(막.지금().때.length).toBeGreaterThanOrEqual(3));
    expect((await 막.끝난다()).기록.어긋남).toBeNull();
    // 처음부터 기대를 깬 채 멈춘 판 — 10초 뒤에는 잡는다
    const 멈춘 = 값읽기시작(게임 as never, 'trial:첫 맵', 볼값들, 기대, Date.now() - 첫값유예ms, 5);
    await vi.waitFor(() => expect(멈춘.지금().어긋남).not.toBeNull());
    expect((await 멈춘.끝난다()).기록.어긋남).toMatchObject({ 값이름: '세계수', 값: 0 });
  });

  it('화면 글자의 서식 태그 안 숫자는 안 읽는다 — #16052 웨이브가 늘 600 이었다', () => {
    expect(수로('<font-weight="600">2/6</font-weight>')).toBe(2);
    expect(수로('<color=red>3</color><size=14>6</size>')).toBe(3);
    expect(어긋난기대([{ 값: '세계수', 비교: '>=', 기준: 40, 까지: { 값: '웨이브', 기준: 6 } }], { 세계수: 0, 웨이브: 수로('<font-weight="600">2/6</font-weight>') })).toMatchObject({ 값: '세계수' });
  });
});

describe('회고 · 다음 해 보기 막기 · 끝 조건', () => {
  const 기록이름 = '20261126003600000-모서리판';
  const 계획줄 = 줄('TRIAL', 'trial:첫 맵', 계획data);
  const 나아감줄 = 줄('GOAL', 'goal:나아감', { 주소: 'ClearCount' });
  const 찾기 = (들: { kind: string; key: string; learned: object }[]) => (k: string) => 들.find((x) => x.key === k) as never;

  it('회고 줄은 까닭 · 열쇠 · 다음 계획이 있어야 받고, 목표에 닿은 수 · 나아감 · 처음 어긋난 때를 기록에서 채운다', () => {
    const 기록들: 판기록[] = [{ 이름: 기록이름, 값기록: 값기록('trial:첫 맵', [{ 초: 0, 값: { 웨이브: 1, 나아감: 0 } }, { 초: 2, 값: { 웨이브: 3, 나아감: 0 } }], { 초: 2, 값이름: '세계수', 값: 42, 기대: '세계수 >= 50' }) }];
    const 들 = [계획줄, 줄('ASK', 'ask:먹이기', {}, 'GUESS')];
    const 회고 = (data: object) => 회고채우기(`play:${기록이름}`, { text: '3웨이브에 짐', belief: 'SEEN', data }, 찾기(들), 기록들);
    expect(회고({ 까닭: '몰랐던것', 열쇠: 'ask:먹이기', 다음: 'trial:첫 맵' })).toMatchObject({ data: { 계획: 'trial:첫 맵', 목표: { 값: '웨이브', 기준: 6, 닿은: 3 }, 나아감: 0, 어긋남: { 초: 2 } } });
    expect(회고({ 까닭: '모름', 다음: 'trial:첫 맵' })).toContain('data.까닭');
    expect(회고({ 까닭: '몰랐던것', 열쇠: 'trial:첫 맵', 다음: 'trial:첫 맵' })).toContain('ASK');
    expect(회고({ 까닭: '손' })).toContain('data.다음');
    expect(회고({ 까닭: '됨' })).toMatchObject({ data: { 까닭: '됨' } });
    expect(회고채우기('play:20261126009999999-없음', { text: 'ㄱ', belief: 'SEEN', data: {} }, 찾기(들), 기록들)).toContain('값 기록이 없다');
    expect(회고없는판(기록들, 들 as never)).toBe(기록이름);
    expect(회고없는판(기록들, [...들, 줄('PLAY', `play:${기록이름}`, {})] as never)).toBeNull();
  });

  it('학습 세션에서만 막는다 — 앞 회고 · 60초 넘는 계획 없는 부르기 · 나아감 줄 · 다섯 번 안 늚', () => {
    const 지도 = 지도읽기('').줄들;
    expect(배움막기(자료, 300, undefined, 지도, [])).toBeNull();
    writeFileSync(join(자료, 'game-learning.now'), '1');
    expect(배움막기(자료, 60, undefined, 지도, [])).toBeNull();
    expect(배움막기(자료, 61, undefined, 지도, [])).toMatchObject({ 막음: expect.stringContaining('--plan') });
    const 들 = [계획줄, 나아감줄].map((x) => ({ ...x, name: x.key, line: '' })) as never as typeof 지도;
    expect(배움막기(자료, 300, 'trial:첫 맵', [들[0]!], [])).toMatchObject({ 막음: expect.stringContaining('goal:나아감') });
    expect(배움막기(자료, 300, 'trial:없음', 들, [])).toMatchObject({ 막음: expect.stringContaining('TRIAL') });
    const 해볼 = 배움막기(자료, 300, 'trial:첫 맵', 들, []);
    expect(해볼).toMatchObject({ 계획: 'trial:첫 맵', 볼값: [{ 이름: '세계수' }, { 이름: '웨이브' }, { 이름: '나아감', 주소: 'ClearCount' }] });
    expect(배움막기(자료, 300, 'trial:첫 맵', 들, [{ 이름: 기록이름, 값기록: 값기록('trial:첫 맵', []) }])).toMatchObject({ 막음: expect.stringContaining(`play:${기록이름}`) });
    // 처음 한 번은 센 것이 없어 늘어난 것으로 친다 — 그 뒤 다섯 번 안 늘면 끝
    // 해 본 판(값기록이 든 기록)이 새로 생길 때만 센다 — 붙지 못해 기록이 안 남은 부르기는 안 센다
    const 판 = (n: number) => [{ 이름: `2026112600000000${n}-판`, 값기록: 값기록('trial:첫 맵', []) }];
    const 회고 = (n: number) => [...들, { ...줄('PLAY', `play:2026112600000000${n}-판`, {}), name: 'ㄱ', line: '' }] as never as typeof 지도;
    for (let i = 0; i < 4; i += 1) expect(배움막기(자료, 300, 'trial:첫 맵', 회고(i), 판(i))).not.toHaveProperty('막음');
    expect(배움막기(자료, 300, 'trial:첫 맵', 회고(3), 판(3))).not.toHaveProperty('막음');
    expect(배움막기(자료, 300, 'trial:첫 맵', 회고(4), 판(4))).toMatchObject({ 막음: expect.stringContaining('배우기를 끝낸다') });
    expect(readFileSync(join(자료, 'game-learn.done'), 'utf8')).toContain('안 늘었다');
  });

  it('게임플레이 계획은 계산 줄(calc:)과 예측 숫자가 있어야 받고, 게임 배우기 계획은 그대로 받는다', () => {
    const 예측 = { 값: '세계수', 비교: '>=' as const, 기준: 40, 까지: { 값: '웨이브', 기준: 5 } };
    const 살기만 = { 값: '세계수', 비교: '>=' as const, 기준: 1 };
    expect(놀이계획검사({ 기대: [예측], 쓸것: ['stage:둘째 맵#걷기'] })).toContain('calc:');
    expect(놀이계획검사({ 기대: [예측] })).toContain('calc:');
    expect(놀이계획검사({ 기대: [살기만], 쓸것: ['calc:둘째 맵 버티기'] })).toContain('예측 숫자');
    expect(놀이계획검사({ 기대: [{ ...살기만, 비교: '>' as const, 기준: 0 }], 쓸것: ['calc:a'] })).toContain('예측 숫자');
    expect(놀이계획검사({ 기대: [살기만, 예측], 쓸것: ['stage:둘째 맵#걷기', 'calc:둘째 맵 버티기'] })).toBeNull();
    expect(놀이계획검사({ 기대: [{ 값: '적', 비교: '<=' as const, 기준: 3 }], 쓸것: ['calc:a'] })).toBeNull();

    const 지도 = 지도읽기('').줄들;
    const 들 = [줄('TRIAL', 'trial:첫 맵', { ...계획data, 기대: [{ 값: '세계수', 비교: '>=', 기준: 1 }] }), 나아감줄].map((x) => ({ ...x, name: x.key, line: '' })) as never as typeof 지도;
    writeFileSync(join(자료, 'game-learning.now'), '1');
    expect(배움막기(자료, 300, 'trial:첫 맵', 들, [])).toMatchObject({ 계획: 'trial:첫 맵' });
    writeFileSync(join(자료, 'game-learn.json'), JSON.stringify({ 쓴ms: 1, 세션: 1, 끝: false, 열쇠: [], 단계: '게임플레이' }));
    expect(배움막기(자료, 300, 'trial:첫 맵', 들, [])).toMatchObject({ 막음: expect.stringContaining('calc:') });
  });

  it('손만 고친 회고가 세 번 이어지고 나아감이 안 늘면 그 세 계획 · 어디서로는 다시 못 한다', () => {
    const 회고 = (n: number, 까닭: string, 나아감: number) => 줄('PLAY', `play:2026112600000000${n}-판`, { 까닭, 나아감, 계획: n === 0 ? 'trial:앞' : 'trial:첫 맵' });
    const 들 = [계획줄, 회고(0, '됨', 1), 회고(1, '손', 0), 회고(2, '손', 1), 회고(3, '손', 0)];
    expect(손막힘(들 as never)).toEqual({ 계획들: ['trial:첫 맵', 'trial:첫 맵', 'trial:첫 맵'], 어디서들: ['ask:첫 맵', 'ask:첫 맵', 'ask:첫 맵'] });
    expect(손막힘([...들.slice(0, 4), 회고(3, '손', 2)] as never)).toBeNull();
    expect(손막힘([...들.slice(0, 4), 회고(3, '몰랐던것', 0)] as never)).toBeNull();
  });

  it('다 배웠나 — 열린 물음 · 갈 곳 상태 · 나아감 줄', () => {
    const 지도 = (들: object[]) => ({ 줄들: 들.map((x) => ({ ...x, name: 'ㄱ', line: '' })) as never, 이름: new Map() });
    expect(남은배울것(지도([]), '2026-11-26')).toEqual(['갈 곳(STAGE) 줄이 없다', 'goal:나아감 줄이 없다']);
    const 곳 = (상태: object) => 줄('STAGE', 'stage:둘째 맵', 상태);
    expect(남은배울것(지도([곳({ 상태: '못감' }), 나아감줄, 줄('ASK', 'ask:가', {}, 'GUESS')]), '2026-11-26')).toEqual(['열린 물음 1', '가 봤거나 못 가는 까닭이 안 적힌 곳 1']);
    expect(남은배울것(지도([곳({ 상태: '못감', 까닭: '잠김' }), 나아감줄]), '2026-11-26')).toEqual([]);
  });
});

describe('적는 명령 — 확인 · 회고를 판 기록으로 대 본다', () => {
  const 빈지도 = 지도읽기('');
  it('대 볼 수 없는 확인은 통째로 안 받고, 회고 줄은 기록에서 읽은 것을 채워 적는다', () => {
    const 확인 = { kind: 'SAVE', key: 'save:최고 기록', name: '진 판은 최고 기록에 안 남음', learned: { text: 'ㄱ', belief: 'CONFIRMED', seen: 7, build: '2.1.3', data: { 진판: 7 } } };
    expect(합치기(빈지도, [], [확인], [])).toContain('save:최고 기록 — 확인으로 못 받는다');
    expect(합치기(빈지도, [], [{ ...확인, learned: { ...확인.learned, belief: 'SEEN' } }], [])).toMatchObject({ 수: 1 });
    const 기록들: 판기록[] = [{ 이름: '20261126003600000-판', 값기록: 값기록('trial:첫 맵', [{ 초: 0, 값: { 웨이브: 2, 나아감: 0 } }]) }];
    const r = 합치기(빈지도, [], [{ ...줄('TRIAL', 'trial:첫 맵', 계획data, 'GUESS'), name: '첫 맵' }, { kind: 'PLAY', key: 'play:20261126003600000-판', name: '회고', learned: { text: '2웨이브에 짐', belief: 'SEEN', data: { 까닭: '손', 다음: 'trial:첫 맵' } } }], 기록들);
    expect(typeof r === 'string' ? r : r.elements.at(-1)).toMatchObject({ learned: { data: { 목표: { 닿은: 2 }, 나아감: 0 } } });
    expect(합치기(빈지도, [], [{ ...줄('TRIAL', 'trial:나쁨', { 볼값: [] }, 'GUESS'), name: 'ㄱ' }], [])).toContain('data.볼값');
    expect(합치기(빈지도, [], [{ ...줄('STAGE', 'stage:둘째', { 상태: '못감' }), name: 'ㄱ' }], [])).toContain('data.상태');
  });
});

it('자료 폴더가 없으면 판 기록은 빈 목록이다', () => {
  expect(판기록들(join(자료, '없음'))).toEqual([]);
  expect(existsSync(join(자료, 'game-play'))).toBe(true);
});
