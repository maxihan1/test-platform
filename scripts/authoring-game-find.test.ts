// 게임 지도 찾기 — 목차(빈 종류까지) · 종류 요약 · 열쇠 하나 전부 · 낱말 찾기 · 점검(근거 없음 · 값 다름 · 빌드 다름 · 없는 관련 열쇠 · 줄 적은 만든 종류)
import { describe, expect, it } from 'vitest';

import { 근거들, 목차, 얹기, 적은줄들, 점검, 지도읽기, 찾기 } from './authoring-game-find.js';

const 배움 = (v: object) => ` · 배움 ${JSON.stringify(v)}`;
const 글 = [
  '# 게임 지도 — 요소 6개 · 배운 줄 5개. 기대값의 근거가 아니다 — 근거는 표준 기획서 항목뿐이다',
  '',
  '## 게임 데이터 (DATA) — 2개',
  `- item:고기 · 고기 · 기획서 {"가격":5,"글":"a · 배움 {b"} · 근거 CGP-REQ-001 · 서버 값 대조 전 · 거친 케이스 없음${배움({ text: '심을 때 쓴다', belief: 'CONFIRMED', seen: 2, build: '59', data: { 가격: 6 } })}`,
  '- item:돌 · 돌 · 기획서 {"가격":1} · 서버 {"가격":2} 다름 (실행 #7) · 거친 케이스 없음',
  '',
  '## 규칙 (RULE) — 2개',
  `- rule:심기 · 심기${배움({ text: '고기 5 를 쓴다', belief: 'CONFIRMED', seen: 1, build: '58', data: { 앞: 20, 뒤: 15 }, related: ['item:고기', 'item:없음'] })}`,
  `- rule:웨이브 · 웨이브${배움({ text: '여섯 번 온다', belief: 'SEEN' })}`,
  '',
  '## 게임이 만든 종류 (KIND) — 2개',
  `- kind:WEATHER · 날씨${배움({ text: '날씨가 무엇을 바꾸나' })}`,
  `- kind:MOOD · 기분${배움({ text: '안 쓰는 종류' })}`,
  '',
  '## 날씨 (WEATHER) — 1개',
  `- weather:눈 · 눈${배움({ text: '느려지나', belief: 'GUESS' })}`,
  '',
].join('\n');
const 지도 = 지도읽기(글);

describe('게임 지도 찾기', () => {
  it('배움은 줄 맨 끝 JSON 이다 — 기획서 값 안의 같은 글자에 속지 않는다', () => {
    expect(지도.줄들.map((x) => [x.kind, x.key, x.name, x.learned?.text])).toEqual([
      ['DATA', 'item:고기', '고기', '심을 때 쓴다'],
      ['DATA', 'item:돌', '돌', undefined],
      ['RULE', 'rule:심기', '심기', '고기 5 를 쓴다'],
      ['RULE', 'rule:웨이브', '웨이브', '여섯 번 온다'],
      ['KIND', 'kind:WEATHER', '날씨', '날씨가 무엇을 바꾸나'],
      ['KIND', 'kind:MOOD', '기분', '안 쓰는 종류'],
      ['WEATHER', 'weather:눈', '눈', '느려지나'],
    ]);
  });

  it('목차는 빈 기본 종류와 게임이 만든 종류까지 찍는다', () => {
    const 줄 = 목차(지도);
    expect(줄).toContain('- RULE 규칙 — 2줄 (덜 봄 1 · 확인 1)');
    expect(줄).toContain('- GOAL 목표 — 비어 있음');
    expect(줄).toContain('- WEATHER 날씨 — 1줄 (추측 1)');
  });

  it('종류는 요약, 열쇠는 줄 전부, 낱말은 열쇠 · 이름 · 배운 글에서 찾는다', () => {
    expect(찾기(지도, ['RULE'])).toEqual(['# RULE — 2줄', '- rule:심기 · 심기 · [확인 · 1번 봄 · 빌드 58] 고기 5 를 쓴다', '- rule:웨이브 · 웨이브 · [덜 봄] 여섯 번 온다']);
    expect(찾기(지도, ['rule:웨이브'])).toEqual(['- rule:웨이브 · 웨이브 · 배움 {"text":"여섯 번 온다","belief":"SEEN"}']);
    expect(찾기(지도, ['느려'])).toEqual(['# 느려 — 1줄', '- weather:눈 · 눈 · [추측] 느려지나']);
    expect(찾기(지도, ['번개'])).toEqual(['없음: 번개']);
  });

  it('점검은 객체가 아닌 기획서 값 · 게임 글의 옛 빌드 · 정의 없는 만든 종류도 짚는다', () => {
    const 다른 = 지도읽기(
      [
        '## 게임 데이터 (DATA) — 1개',
        `- rate:drop · 드랍 · 기획서 0.05 · 근거 R-1 · 기획서가 바뀜(R-1) — 지금 판으로 다시 올린다${배움({ text: '스무 번에 네 번', belief: 'GAME_TEXT', build: '58', data: 0.2 })}`,
        '## WEATHER (WEATHER) — 3개',
        ...['눈', '비', '해'].map((x) => `- weather:${x} · ${x}${배움({ text: x, belief: 'GUESS' })}`),
      ].join('\n'),
    );
    expect(점검(다른, '59').slice(1)).toEqual([
      '기획서가 바뀜: rate:drop — R-1',
      '빌드 다름: rate:drop — 58 에서 봄, 지금 59 · 재확인',
      '값 다름: rate:drop — 기획서 값과 배운 값',
      '만든 종류: WEATHER — 정의 줄(kind:WEATHER)이 없다',
    ]);
    expect(찾기(다른, ['DATA'])[1]).toBe('- 기획서가 바뀜(R-1) · rate:drop · 드랍 · [게임 글 · 빌드 58] 스무 번에 네 번 · 기획서 값 있음');
  });

  it('점검은 근거 없음 · 값 다름 · 빌드 다름 · 없는 관련 열쇠 · 줄 적은 만든 종류를 짚는다', () => {
    expect(점검(지도, '59')).toEqual([
      '# 게임 지도 점검 — 8건',
      '값 다름: item:고기 — 기획서 값과 배운 값(가격)',
      '값 다름: item:돌 — 기획서 값과 서버 값',
      '근거 없음: rule:심기 — 확인인데 한 번 봄',
      '빌드 다름: rule:심기 — 58 에서 봄, 지금 59 · 재확인',
      '관련 열쇠 없음: rule:심기 — item:없음',
      '근거 없음: rule:웨이브 — 덜 봄인데 잰 값 · 본 횟수 · 빌드 없음',
      '만든 종류: WEATHER 날씨 — 1줄이다. 셋이 안 되면 기본 종류로 되돌린다',
      '만든 종류: kind:MOOD — 쓰는 줄이 없다. 되돌린다',
    ]);
    expect(점검(지도)[0]).toContain('빌드 다름은 안 봄');
  });
});

describe('아직 안 올린 배운 줄 얹기', () => {
  const 줄 = (x: object) => JSON.stringify({ elements: [x] });
  it('새 줄은 더하고 있던 줄은 배움만 바꾼다 — 기획서 몫은 남는다', () => {
    const r = 얹기(지도, 적은줄들(JSON.stringify({ elements: [
      { kind: 'TIME', key: 'time:쿨', name: '쿨타임', learned: { text: '3초', belief: 'SEEN' }, reqIds: ['CGP-REQ-009'] },
      { kind: 'RULE', key: 'item:고기', name: '다른 이름', learned: { text: '공격에도 쓴다', belief: 'GUESS' } },
    ] })));
    expect(r.줄들.find((x) => x.key === 'time:쿨')).toMatchObject({ kind: 'TIME', learned: { text: '3초' } });
    const 고기 = r.줄들.find((x) => x.key === 'item:고기')!;
    expect([고기.kind, 고기.name, 고기.learned?.text]).toEqual(['DATA', '고기', '공격에도 쓴다']);
    expect(고기.line).toContain('기획서 {"가격":5,"글":"a · 배움 {b"}');
    expect(근거들(고기)).toEqual(['CGP-REQ-001']);
    expect(근거들(r.줄들.find((x) => x.key === 'time:쿨')!)).toEqual(['CGP-REQ-009']);
  });

  it('지운 줄(null)은 배운 것만 있던 줄이면 빠지고 기획서 줄이면 배움만 뗀다', () => {
    expect(얹기(지도, 적은줄들(줄({ kind: 'RULE', key: 'rule:웨이브', name: '웨이브', learned: null }))).줄들.some((x) => x.key === 'rule:웨이브')).toBe(false);
    expect(얹기(지도, 적은줄들(줄({ kind: 'DATA', key: 'item:고기', name: '고기', learned: null }))).줄들.find((x) => x.key === 'item:고기')?.learned).toBeNull();
  });

  it('깨진 파일은 빈 목록이다', () => {
    expect(적은줄들('{')).toEqual([]);
    expect(적은줄들(null)).toEqual([]);
    expect(적은줄들(JSON.stringify({ elements: [null, { kind: 'RULE', key: 'rule:a', name: 'a', learned: {} }, { kind: 'RULE', key: 'rule:b', name: 'b', learned: null, reqIds: 'x' }] }))).toEqual([]);
  });
});
