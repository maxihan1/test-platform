// 설정 › BTS 연결의 구획 조각 — 상태 매핑 · 코드 저장소 · 자동 설정 결과 · 배포 스크립트 한 줄 (SPEC 도메인/BTS §8.15 · 시안 B 3판). SettingsBts.tsx 가 300줄에 닿지 않게 뗐다

import { useState } from 'react';

import type { SettingsServiceRow } from './api.js';
import type { BTS고를목록, BTS설정결과, 상태단계, 해결단계 } from './btsApi.js';
import { BTS이름 } from './btsName.js';
import { use말 } from './i18n.js';
import { 구획 } from './SettingsServiceParts.js';

export const 상태단계들: [상태단계, string][] = [
  ['DEPLOY_WAIT', '배포 대기'],
  ['QA_REQUEST', 'QA 요청'],
  ['QA_REVIEW', 'QA 검토'],
  ['DEV_REQUEST', '개발 요청'],
  ['CODE_REVIEW', '코드 리뷰'],
  ['CLOSED', '닫힘'],
];

export const 해결단계들: [해결단계, string][] = [
  ['SCREEN_RIGHT', '화면이 맞음'],
  ['TEST_PROBLEM', '테스트 문제'],
  ['FLAKY', '흔들림'],
  ['ENV', '환경 문제'],
  ['DUPLICATE', '중복'],
];

/** 목록을 불러왔으면 고르개, 못 불러왔으면 글 칸 — 상태는 키, 해결 사유는 이름을 저장한다. 저장해 둔 값이 목록에 없어도 고르개에 남긴다 */
function 고르는칸({ id, 값, 고를것, 바꾼다 }: { id: string; 값: string; 고를것: { 값: string; 이름: string }[] | null; 바꾼다: (v: string) => void }) {
  const t = use말();
  if (고를것 === null) return <input id={id} type="text" value={값} onChange={(e) => 바꾼다(e.target.value)} />;
  const 있나 = 값 === '' || 고를것.some((it) => it.값 === 값);
  return (
    <select id={id} value={값} onChange={(e) => 바꾼다(e.target.value)}>
      <option value="">{t('고르세요')}</option>
      {있나 ? null : <option value={값}>{값}</option>}
      {고를것.map((it) => (
        <option key={it.값} value={it.값}>
          {it.이름}
        </option>
      ))}
    </select>
  );
}

export function 상태매핑구획(p: {
  상태: Partial<Record<상태단계, string>>;
  해결: Partial<Record<해결단계, string>>;
  목록: BTS고를목록 | null;
  불러오는중: boolean;
  목록오류: string | null;
  불러온다: () => void;
  상태바꿈: (단계: 상태단계, 값: string) => void;
  해결바꿈: (단계: 해결단계, 값: string) => void;
}) {
  const t = use말();
  const 상태목록 = p.목록?.statuses.map((it) => ({ 값: it.key, 이름: it.name })) ?? null;
  const 해결목록 = p.목록?.resolutions.map((it) => ({ 값: it.name, 이름: it.name })) ?? null;
  return (
    <구획 제목={t('상태 매핑')} 쓰임={t('QA Hub 단계마다 {bts} 상태를 하나씩 고릅니다. 비어 있는 단계가 있으면 저장할 수 없습니다', { bts: BTS이름 })}>
      <div className="bts-load">
        <button type="button" className="btn ghost" disabled={p.불러오는중} onClick={p.불러온다}>
          {p.목록 === null ? t('{bts} 에서 불러오기', { bts: BTS이름 }) : t('다시 불러오기')}
        </button>
        {p.목록오류 !== null ? (
          <span className="err">{p.목록오류}</span>
        ) : p.목록 === null ? null : (
          <span className="hint">
            {t('{bts} 에서 상태 {상태}개 · 해결 사유 {해결}개를 불러왔습니다', { bts: BTS이름, 상태: p.목록.statuses.length, 해결: p.목록.resolutions.length })}
          </span>
        )}
      </div>
      <h4 className="bts-sub">{t('상태')}</h4>
      <div className="bts-pair">
        {상태단계들.map(([단계, 이름]) => (
          <div key={단계} className="field">
            <label htmlFor={`bts-s-${단계}`}>{t(이름)}</label>
            <고르는칸 id={`bts-s-${단계}`} 값={p.상태[단계] ?? ''} 고를것={상태목록} 바꾼다={(v) => p.상태바꿈(단계, v)} />
          </div>
        ))}
      </div>
      <h4 className="bts-sub">{t('해결 사유')}</h4>
      <div className="bts-pair">
        {해결단계들.map(([단계, 이름]) => (
          <div key={단계} className="field">
            <label htmlFor={`bts-r-${단계}`}>{t(이름)}</label>
            <고르는칸 id={`bts-r-${단계}`} 값={p.해결[단계] ?? ''} 고를것={해결목록} 바꾼다={(v) => p.해결바꿈(단계, v)} />
          </div>
        ))}
      </div>
    </구획>
  );
}

export type 저장소들 = Record<number, { name: string; url: string }[]>;

export function 코드저장소구획({ 앱들, 저장소, 바꾼다 }: { 앱들: SettingsServiceRow[]; 저장소: 저장소들; 바꾼다: (앱: number, 줄: { name: string; url: string }[]) => void }) {
  const t = use말();
  return (
    <구획 제목={t('코드 저장소')} 쓰임={t('수정 AI 가 코드를 내려받을 저장소입니다. 애플리케이션마다 따로 저장됩니다')}>
      {앱들.map((앱) => {
        const 줄들 = 저장소[앱.id] ?? [];
        return (
          <div key={앱.id} className="bts-repo">
            <span className="set-name">
              {앱.name} <span className="set-sub">{앱.prefix}</span>
            </span>
            {줄들.map((줄, i) => (
              <div key={i} className="bts-repo-row">
                <input type="text" value={줄.name} maxLength={50} aria-label={t('{앱} 저장소 {번호} 이름', { 앱: 앱.name, 번호: i + 1 })} placeholder={t('화면')}
                  onChange={(e) => 바꾼다(앱.id, 줄들.map((it, j) => (j === i ? { ...it, name: e.target.value } : it)))} />
                <input type="url" value={줄.url} aria-label={t('{앱} 저장소 {번호} 주소', { 앱: 앱.name, 번호: i + 1 })} placeholder="https://github.com/…"
                  onChange={(e) => 바꾼다(앱.id, 줄들.map((it, j) => (j === i ? { ...it, url: e.target.value } : it)))} />
                <button type="button" className="btn ghost icon" aria-label={t('{앱} 저장소 {번호} 빼기', { 앱: 앱.name, 번호: i + 1 })}
                  onClick={() => 바꾼다(앱.id, 줄들.filter((_, j) => j !== i))}>
                  −
                </button>
              </div>
            ))}
            {줄들.length >= 10 ? null : (
              <button type="button" className="btn ghost" onClick={() => 바꾼다(앱.id, [...줄들, { name: '', url: '' }])}>
                {t('+ 저장소 추가')}
              </button>
            )}
          </div>
        );
      })}
    </구획>
  );
}

const 항목이름: Record<BTS설정결과['what'], string> = {
  WEBHOOK: '웹훅',
  RULE_ASSIGNEE: '담당자 변경 규칙',
  RULE_PR: 'PR 병합 규칙',
  BOARD: '보드 「QA 검토」 칸',
};

const 항목쓰임: Record<BTS설정결과['what'], string> = {
  WEBHOOK: '이슈 생성 · 상태 변경을 QA Hub 로 보냅니다',
  RULE_ASSIGNEE: '담당자가 바뀌면 QA Hub 를 부릅니다',
  RULE_PR: 'PR 이 병합되면 QA Hub 를 부릅니다',
  BOARD: '실패로 올린 이슈가 이 칸에 섭니다',
};

/** 결과가 없으면(아직 안 눌렀으면) 넷을 이름과 쓰임만 보인다. 막힌 것만 ✕ 와 까닭 */
export function 자동설정결과({ 결과 }: { 결과: BTS설정결과[] | null }) {
  const t = use말();
  const 까닭 = (r: BTS설정결과) =>
    r.status === 403 ? t('권한 없음') : r.what === 'BOARD' && r.status === 404 ? t('보드 없음') : r.status === 0 || r.status === undefined ? t('접속하지 못함') : t('실패 ({코드})', { 코드: r.status });
  const 웹훅막힘 = 결과?.some((r) => r.what === 'WEBHOOK' && r.status === 403) ?? false;
  return (
    <>
      {웹훅막힘 ? (
        <div className="err" role="alert">
          {t('웹훅은 {bts} 시스템 관리자만 만들 수 있습니다. 관리자에게 이 화면에서 다시 눌러 달라고 요청해 주세요', { bts: BTS이름 })}
        </div>
      ) : null}
      <ul className="bts-checks">
        {(Object.keys(항목이름) as BTS설정결과['what'][]).map((what) => {
          const r = 결과?.find((it) => it.what === what);
          return (
            <li key={what} className={r === undefined ? '' : r.ok ? 'ok' : 'no'}>
              <b aria-hidden="true">{r === undefined ? '·' : r.ok ? '✓' : '✕'}</b>
              <span>{t(항목이름[what])}</span>
              <small>{r === undefined || r.ok ? t(항목쓰임[what]) : 까닭(r)}</small>
            </li>
          );
        })}
      </ul>
      <p className="hint">{t('PR 병합 규칙은 {bts} 프로젝트에 GitHub 연결이 있어야 동작합니다', { bts: BTS이름 })}</p>
    </>
  );
}

/** deploy.sh 에 넣을 한 줄. 배포 서버는 회사 것이라 QA Hub 가 못 고친다 — 사람 손이 남는 유일한 자리다 */
export function 배포한줄({ 바탕, projectId, 원문 }: { 바탕: string; projectId: number; 원문: string | null }) {
  const t = use말();
  const [복사, set복사] = useState<'ok' | 'no' | null>(null);
  // 한국어가 든 템플릿 문자열은 messages.test.ts 가 막으므로 자리 표시는 따로 옮긴다
  const 열쇠 = 원문 ?? `<${t('배포 알림 토큰')}>`;
  const 줄 = [
    `curl --fail -X POST -H "Authorization: Bearer ${열쇠}" \\`,
    `  -H "Content-Type: application/json" -d '{"build":"'"$BUILD"'"}' \\`,
    `  ${바탕}/api/projects/${projectId}/deploys`,
  ].join('\n');
  // 클립보드는 https 에서만 열린다 — 실패하면 글 상자에서 직접 고르게 한다(SettingsCiTokens.tsx 와 같다)
  const 복사하기 = () =>
    void Promise.resolve()
      .then(() => navigator.clipboard.writeText(줄))
      .then(() => set복사('ok'), () => set복사('no'));
  return (
    <div className="bts-copy">
      <pre>{줄}</pre>
      <button type="button" className="btn" onClick={복사하기}>
        {복사 === 'ok' ? t('복사했습니다') : t('복사')}
      </button>
      {복사 === 'no' ? <p className="hint">{t('복사하지 못했습니다. 글을 직접 골라 복사해 주세요')}</p> : null}
    </div>
  );
}
