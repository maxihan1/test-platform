import { describe, expect, it } from 'vitest';

import { 게임항목오류 } from './gameJudge.js';

const 단계 = [
  { seq: 1, startedAt: '2026-11-12T03:00:00.000Z' },
  { seq: 2, startedAt: '2026-11-12T03:00:10.000Z' },
  { seq: 3, startedAt: null },
];

const 스택 = 'Unity.BossRoom.Gameplay.ClientCharacter.OnAnimEvent (System.String id) [0x00012] in <abc>:0\nUnityEngine.Animator.FireEvent () (at Assets/Engine.cs:10)';

const 파일 = [
  '# 게임 오류 4개',
  '',
  `#1 2026-11-12T03:00:05.000Z Exception: NullReferenceException: 첫 번째`,
  스택,
  '',
  '#2 2026-11-12T03:00:06.000Z Error: 서버 응답이 늦습니다',
  'Unity.Net.Client.Send ()',
  '',
  `#3 2026-11-12T03:00:12.000Z Exception: NullReferenceException: 두 번째`,
  스택,
  '',
  '#4 12:00:30 Exception: ArgumentException: 옛 SDK 시각',
  'Unity.BossRoom.Gameplay.Inventory.Add ()',
  '',
].join('\n');

describe('게임항목오류', () => {
  it('Exception 만 고르고 같은 지문은 횟수를 더한다 — 견본 · 단계는 처음 난 것', () => {
    const 오류 = 게임항목오류(파일, 단계);
    expect(오류).toHaveLength(2);
    const [널, 인자] = 오류;
    expect(널!.지문.title).toBe('NullReferenceException · ClientCharacter.OnAnimEvent');
    expect(널!.hits).toBe(2);
    expect(널!.seq).toBe(1);
    expect(널!.견본).toBe(`#1 2026-11-12T03:00:05.000Z Exception: NullReferenceException: 첫 번째\n${스택}`);
    expect(인자!.지문.title).toBe('ArgumentException · Inventory.Add');
    expect(인자!.seq).toBeNull();
  });

  it('머리 줄만 있는 파일은 오류가 없다', () => {
    expect(게임항목오류('# 게임 Exception 0개 — 통과 항목이라 Exception 만 남겼습니다\n', 단계)).toEqual([]);
  });
});
