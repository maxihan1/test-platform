// E2E 조립 화면 팔레트와 마법사 「단계」가 같이 쓰는 재료 — 한 애플리케이션의 기능 테스트 목록과 첫 단계 · 다음 단계 추천 (도메인/시나리오 §8.11)

import { useEffect, useState } from 'react';

import { api, type CaseRow } from './api.js';
import { use언어 } from './i18n.js';
import { scenarioApi, type NextCase } from './scenarioApi.js';
import { message } from './ui.js';

// ponytail: 20쪽(1000건) 상한. 넘는 서비스가 생기면 서버 찾기로 바꾼다
const 쪽상한 = 20;

export interface 읽은것 {
  목록: CaseRow[];
  잘림: boolean;
  /** 서비스가 PRD 를 쓰나 — 서버 hasFeatures. 검색 조건 · 쪽을 안 따른다 */
  PRD씀: boolean;
}

async function 모으기(service: string, 끊겼나: () => boolean): Promise<읽은것> {
  const 목록: CaseRow[] = [];
  let PRD씀 = false;
  for (let page = 1; page <= 쪽상한; page += 1) {
    const 쪽 = await api.cases({ service, kind: 'FN', page });
    목록.push(...쪽.items);
    PRD씀 ||= 쪽.hasFeatures === true;
    if (끊겼나() || 쪽.items.length === 0 || 쪽.items.length < 쪽.pageSize) return { 목록, 잘림: false, PRD씀 };
  }
  return { 목록, 잘림: true, PRD씀 };
}

/** 그 애플리케이션의 기능 테스트 전부. 애플리케이션이 바뀌면 처음부터 다시 받는다 */
export function use케이스목록(앱: string): { 읽음: 읽은것 | null; 오류: string | null } {
  const 언어 = use언어();
  const [읽음, set읽음] = useState<읽은것 | null>(null);
  const [오류, set오류] = useState<string | null>(null);
  useEffect(() => {
    let 끊김 = false;
    set읽음(null);
    set오류(null);
    모으기(앱, () => 끊김).then(
      (값) => {
        if (!끊김) set읽음(값);
      },
      (err: unknown) => {
        if (!끊김) set오류(message(err, 언어));
      },
    );
    return () => {
      // 서비스가 바뀌거나 탭을 떠난 뒤 늦게 온 쪽이 다른 목록을 덮지 않게 한다
      끊김 = true;
    };
  }, [앱, 언어]);
  return { 읽음, 오류 };
}

/**
 * 추천 재료. 기준이 빈 글자면 첫 단계 후보(after 를 뺀 꼴, 결정 15), 케이스 번호면 그 케이스 다음, null 이면 묻지 않는다.
 * items 는 지금 기준의 것만 준다 — 단계를 더한 직후 한 번 그릴 때 앞 기준 추천이 새 머리 아래 보이지 않게
 */
export function use단계추천(앱: string, 기준: string | null): { items: NextCase[] | null; 오류: string | null } {
  const 언어 = use언어();
  const [추천, set추천] = useState<{ 앱: string; 기준: string; items: NextCase[] } | null>(null);
  const [오류, set오류] = useState<string | null>(null);
  useEffect(() => {
    let 끊김 = false;
    set추천(null);
    set오류(null);
    if (기준 === null) return;
    scenarioApi.nextCases(앱, 기준 === '' ? undefined : 기준).then(
      (값) => {
        if (!끊김) set추천({ 앱, 기준, items: 값.items });
      },
      (err: unknown) => {
        if (!끊김) set오류(message(err, 언어));
      },
    );
    return () => {
      // 단계를 잇달아 더하면 앞 단계 기준 추천이 늦게 와서 덮을 수 있다
      끊김 = true;
    };
  }, [앱, 기준, 언어]);
  return { items: 추천 !== null && 추천.앱 === 앱 && 추천.기준 === 기준 ? 추천.items : null, 오류 };
}
