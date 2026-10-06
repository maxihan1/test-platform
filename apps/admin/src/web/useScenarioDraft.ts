// E2E 시나리오 조립 화면의 상태 — 불러오기 · 고치는 중인 초안 · 저장본과의 차이 · 저장

import type { ScenarioPart } from '@platform/kit';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, type Platform } from './api.js';
import { use말, use언어 } from './i18n.js';
import { scenarioApi, type CasePartMaterial, type ScenarioDetail } from './scenarioApi.js';
import { 가리킴빈곳, type 재료들 } from './scenarioView.js';
import { message } from './ui.js';

type 점검들 = ScenarioDetail['checks'];
type 버전들 = ScenarioDetail['versions'];

const 찍는다 = (이름: string, 디바이스: Platform, 단계들: ScenarioPart[]): string =>
  JSON.stringify({ 이름, 디바이스, 단계들 });

// 404 는 비활성 · 사라진 케이스라 그 tcId 만 null(재료 없음)로 둔다. 그 밖의 오류는 서버가 아픈 것이니 삼키지 않는다 —
// 삼키면 「실행 불가」 칩처럼 보여 케이스 탓으로 읽힌다
const 재료읽기 = (tcId: string): Promise<CasePartMaterial | null> =>
  scenarioApi.caseParts(tcId).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });

function 케이스번호들(parts: ScenarioPart[]): string[] {
  return [...new Set(parts.flatMap((p) => (p.kind === 'case' ? [p.tcId] : [])))];
}

/**
 * @param id 기존 시나리오 번호. 새 것이면 null
 * @param 새서비스 새 시나리오가 속할 접두사. 처음 받은 값으로 고정한다 — 조립 중 띠를 바꿔도 초안이 다른 서비스로 가지 않게
 */
export function useScenarioDraft(id: number | null, 새서비스: string | null) {
  const t = use말();
  const 언어 = use언어();
  const [불러옴, set불러옴] = useState(id === null);
  const [오류, set오류] = useState<string | null>(null);
  const [서비스, set서비스] = useState(새서비스 ?? '');
  const [이름, set이름] = useState('');
  const [디바이스, set디바이스] = useState<Platform>('desktop');
  const [단계들, set단계들] = useState<ScenarioPart[]>([]);
  const [재료, set재료] = useState<재료들>(new Map());
  const [점검, set점검] = useState<점검들>([]);
  const [버전, set버전] = useState<number | null>(null);
  const [버전들, set버전들] = useState<버전들>([]);
  const [살아있나, set살아있나] = useState(true);
  const [저장본, set저장본] = useState(() => 찍는다('', 'desktop', []));
  const [저장오류, set저장오류] = useState<string | null>(null);
  const [저장하는중, set저장하는중] = useState(false);
  // 같은 재료를 두 번 부르지 않으려고 이미 부른 번호를 기억한다
  const 부른것 = useRef(new Set<string>());
  // 언어를 바꿔도 불러온 초안을 다시 덮지 않으려고 효과의 의존에서 뺀다
  const 언어쪽 = useRef(언어);
  언어쪽.current = 언어;

  useEffect(() => {
    if (id === null) return;
    let 끝남 = false;
    (async () => {
      try {
        const 상세 = await scenarioApi.detail(id);
        const 번호들 = 케이스번호들(상세.parts);
        번호들.forEach((n) => 부른것.current.add(n));
        const 읽음 = await Promise.all(번호들.map(async (n) => [n, await 재료읽기(n)] as const));
        if (끝남) return;
        set서비스(상세.service);
        set이름(상세.name);
        set디바이스(상세.platform);
        set단계들(상세.parts);
        set재료(new Map(읽음));
        set점검(상세.checks);
        set버전(상세.version);
        set버전들(상세.versions);
        set살아있나(상세.isActive);
        set저장본(찍는다(상세.name, 상세.platform, 상세.parts));
        set불러옴(true);
      } catch (err) {
        if (!끝남) set오류(message(err, 언어쪽.current));
      }
    })();
    return () => {
      끝남 = true;
    };
  }, [id]);

  /** 초안은 건드리지 않고 서버가 들고 있는 버전 이력 · 확인 필요 · 치움 여부만 새로 읽는다 */
  const 다시읽기 = useCallback(async () => {
    if (id === null) return;
    try {
      const 상세 = await scenarioApi.detail(id);
      set버전들(상세.versions);
      set점검(상세.checks);
      set살아있나(상세.isActive);
    } catch (err) {
      set저장오류(message(err, 언어));
    }
  }, [id, 언어]);

  const 재료더하기 = useCallback((tcId: string) => {
    if (부른것.current.has(tcId)) return;
    부른것.current.add(tcId);
    재료읽기(tcId).then(
      (값) => set재료((앞) => new Map(앞).set(tcId, 값)),
      (err: unknown) => {
        // 지워 두어야 같은 케이스를 다시 고를 때 다시 불러 본다
        부른것.current.delete(tcId);
        set저장오류(message(err, 언어쪽.current));
      },
    );
  }, []);

  const 바뀜 = 찍는다(이름, 디바이스, 단계들) !== 저장본;

  async function 저장(): Promise<{ id: number; version: number } | null> {
    if (저장하는중) return null;
    const 사유 =
      이름.trim() === ''
        ? t('시나리오 이름을 적어야 저장할 수 있습니다')
        : 단계들.length === 0
          ? t('단계를 하나 이상 넣어야 저장할 수 있습니다')
          : 가리킴빈곳(단계들).length > 0
            ? t('가져올 단계를 다시 골라야 저장할 수 있습니다')
            : null;
    if (사유 !== null) {
      set저장오류(사유);
      return null;
    }
    set저장오류(null);
    set저장하는중(true);
    const 보낼이름 = 이름.trim();
    try {
      let 결과: { id: number; version: number };
      if (id === null) {
        결과 = await scenarioApi.create({ service: 서비스, name: 보낼이름, platform: 디바이스, parts: 단계들 });
      } else {
        if (버전 === null) return null;
        const { version } = await scenarioApi.update(id, {
          name: 보낼이름,
          platform: 디바이스,
          parts: 단계들,
          baseVersion: 버전,
        });
        결과 = { id, version };
      }
      // 서버가 공백을 다듬어 저장하니 초안도 맞춘다 — 안 맞추면 저장 직후에도 바뀐 것으로 읽힌다
      set이름(보낼이름);
      set저장본(찍는다(보낼이름, 디바이스, 단계들));
      set버전(결과.version);
      if (id !== null) await 다시읽기();
      return 결과;
    } catch (err) {
      set저장오류(message(err, 언어));
      return null;
    } finally {
      set저장하는중(false);
    }
  }

  return {
    불러옴,
    오류,
    서비스,
    이름,
    디바이스,
    단계들,
    재료,
    점검,
    버전,
    버전들,
    살아있나,
    바뀜,
    set이름,
    set디바이스,
    단계들바꾸기: set단계들,
    재료더하기,
    저장,
    저장오류,
    저장하는중,
    다시읽기,
  };
}
