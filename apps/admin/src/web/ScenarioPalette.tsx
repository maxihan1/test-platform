// E2E 시나리오 조립 화면 「단계 추가」 탭 속 — 기능 테스트 스크립트 팔레트 · 다른 단계 넷 · 케이스 바꾸기 모드 (도메인/시나리오 §8.11)

import { useEffect, useState } from 'react';
import type { ScenarioPart } from '@platform/kit';

import { api, type CaseRow, type Platform } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 팔레트차례 } from './scenarioView.js';
import { Failed, Loading, message, PLATFORM_LABEL } from './ui.js';

export type 다른단계 = Exclude<ScenarioPart, { kind: 'case' }>;

// ponytail: 20쪽(1000건) 상한. 넘는 서비스가 생기면 서버 찾기로 바꾼다
const 쪽상한 = 20;

async function 모으기(service: string, 끊겼나: () => boolean): Promise<{ 목록: CaseRow[]; 잘림: boolean }> {
  const 목록: CaseRow[] = [];
  for (let page = 1; page <= 쪽상한; page += 1) {
    const 쪽 = await api.cases({ service, kind: 'FN', page });
    목록.push(...쪽.items);
    if (끊겼나() || 쪽.items.length === 0 || 쪽.items.length < 쪽.pageSize) return { 목록, 잘림: false };
  }
  return { 목록, 잘림: true };
}

const 다른단계들: { 이름: string; 단계: () => 다른단계 }[] = [
  { 이름: 'API 호출', 단계: () => ({ kind: 'api', method: 'GET', path: '/', expectStatus: 200 }) },
  {
    이름: '모킹 켜기',
    단계: () => ({ kind: 'mock', urlPattern: '**/api/**', status: 200, contentType: 'application/json', body: '{}' }),
  },
  // 빈 무늬로 두어 「N번 설정」 패널이 앞에서 켠 무늬를 고르게 한다
  { 이름: '모킹 끄기', 단계: () => ({ kind: 'unmock', urlPattern: '' }) },
  { 이름: '대기§단계', 단계: () => ({ kind: 'wait', ms: 1000 }) },
];

interface Props {
  서비스: string;
  디바이스: Platform;
  /** 케이스 바꾸기로 들어온 단계 번호. null 이면 맨 끝에 더하는 보통 모드 */
  바꿀번호: number | null;
  on케이스: (tcId: string) => void;
  on다른단계: (part: 다른단계) => void;
  on바꾸기취소: () => void;
}

export function ScenarioPalette({ 서비스, 디바이스, 바꿀번호, on케이스, on다른단계, on바꾸기취소 }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [읽음, set읽음] = useState<{ 목록: CaseRow[]; 잘림: boolean } | null>(null);
  const [오류, set오류] = useState<string | null>(null);
  const [찾기, set찾기] = useState('');
  const [입력값펼침, set입력값펼침] = useState(false);

  useEffect(() => {
    let 끊김 = false;
    set읽음(null);
    set오류(null);
    모으기(서비스, () => 끊김).then(
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
  }, [서비스, 언어]);

  const 줄 = (c: CaseRow) => (
    <li key={c.tcId} className="scn-pal-row">
      <span className="scn-pal-id">{c.tcId}</span>
      <span className="scn-pal-name">{c.name}</span>
      {typeof c.unconfirmed === 'string' ? <span className="case-tag">{t('미확정')}</span> : null}
      <button type="button" className="btn ghost" onClick={() => on케이스(c.tcId)}>
        {t('{번호} 더하기', { 번호: c.tcId })}
      </button>
    </li>
  );

  const 차례 = 읽음 === null ? null : 팔레트차례(읽음.목록, 디바이스);
  const 소문자 = 찾기.trim().toLowerCase();
  const 걸린 = (c: CaseRow) => 소문자 === '' || `${c.tcId} ${c.name}`.toLowerCase().includes(소문자);
  const 흐름 = 차례?.흐름.filter(걸린) ?? [];
  const 입력값 = 차례?.입력값.filter(걸린) ?? [];

  return (
    <div className="scn-palette">
      {바꿀번호 === null ? (
        <div className="scn-link-kinds">
          {다른단계들.map((x) => (
            <button key={x.이름} type="button" className="btn ghost" onClick={() => on다른단계(x.단계())}>
              {t(x.이름)}
            </button>
          ))}
        </div>
      ) : (
        <div className="scn-pal-swap">
          <p className="scn-set-sub">{t('{번호}번 단계를 바꿀 케이스를 고릅니다', { 번호: 바꿀번호 })}</p>
          <button type="button" className="btn ghost" onClick={on바꾸기취소}>
            {t('취소')}
          </button>
        </div>
      )}

      {오류 !== null ? (
        <Failed error={오류} />
      ) : 읽음 === null || 차례 === null ? (
        <Loading />
      ) : 읽음.목록.length === 0 ? (
        <p className="scn-set-note">{t('이 서비스에는 단계로 쓸 기능 테스트 스크립트가 없습니다')}</p>
      ) : (
        <>
          <label className="scn-pal-find">
            <span className="scn-set-sub">{t('케이스 찾기')}</span>
            <input type="text" value={찾기} onChange={(e) => set찾기(e.target.value)} />
          </label>
          {!읽음.잘림 ? null : (
            <p className="scn-set-note">{t('케이스가 많아 앞 {수}건만 보입니다. 찾기로 좁힙니다', { 수: 읽음.목록.length })}</p>
          )}
          {차례.뺀수 === 0 ? null : (
            <p className="scn-set-note">
              {t('{디바이스}에서 돌지 않는 케이스 {수}건은 뺐습니다', { 디바이스: t(PLATFORM_LABEL[디바이스]), 수: 차례.뺀수 })}
            </p>
          )}
          <section className="scn-pal-group">
            <h3 className="scn-set-sub">{t('업무 흐름 케이스')}</h3>
            <p className="scn-set-note">{t('상태 전이 사용 또는 기법 표시 없음')}</p>
            <ul className="scn-pal-list">{흐름.map(줄)}</ul>
          </section>
          <section className="scn-pal-group">
            <h3 className="scn-set-sub">
              <button
                type="button"
                className="scn-pal-fold"
                aria-expanded={입력값펼침}
                onClick={() => set입력값펼침((앞) => !앞)}
              >
                {t('입력값 검증 케이스 {수}', { 수: 입력값.length })}
              </button>
            </h3>
            <p className="scn-set-note">{t('경계값 · 동등 분할 · 결정 테이블만 사용')}</p>
            {!입력값펼침 ? null : <ul className="scn-pal-list">{입력값.map(줄)}</ul>}
          </section>
        </>
      )}
    </div>
  );
}
