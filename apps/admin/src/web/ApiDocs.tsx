// 「PRD 관리 › API 문서」 화면 — Swagger 버전을 받고 · 본다. 바뀐 API 를 테스트에 반영하는 일은 테스트 작성의 「결정 필요」 한 곳이다 (도메인/API §8.13 · 도메인/작성 §3.6 「★ 결정 목록」)
// PRD 관리 · 애플리케이션 가이드와 같은 배치다 — 머리의 「버전 기록」 표 → 할 일 카드 → 전체 목록

import { useRef, useState } from 'react';

import { apiDocApi, type ApiDocList } from './apiDocApi.js';
import { ApiError, type ServiceRow } from './api.js';
import { ApiDocList as 전체API } from './ApiDocList.js';
import { 안거친응답카드 } from './ApiDocCards.js';
import { ApiDocVersions } from './ApiDocVersions.js';
import { 받은곳 } from './apidocView.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import type { 판정 } from './role.js';
import { Failed, Loading, message, useAsync, 기다림글자 } from './ui.js';

/** API 애플리케이션이 아니거나 아직 고른 애플리케이션이 없을 때 본문 한 줄 (§8.13 첫 줄) */
export function API안내({ 설정보나 }: { 설정보나: boolean }) {
  const t = use말();
  return (
    <>
      <Head 위치={t('PRD 관리')} 제목={t('API 문서')} />
      <div className="screen">
        <div className="empty">
          {t('API 애플리케이션을 고르면 API 문서가 보입니다')}
          {설정보나 ? (
            <small>
              <a href="#/settings">{t('설정에서 종류 보기')}</a>
            </small>
          ) : null}
        </div>
      </div>
    </>
  );
}

// 화면 애플리케이션이면 서버가 NOT_API_SERVICE 를 낸다 — 오류가 아니라 안내 한 줄로 그린다 (§8.13 첫 줄)
const 화면앱 = 'SCREEN' as const;

export function ApiDocs({ service, 할수, 버전, 설정보나 }: { service: ServiceRow; 할수: 판정; 버전?: number; 설정보나: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const id = service.id;
  const 목록 = useAsync(
    () => apiDocApi.list(id).catch((err: unknown): ApiDocList | typeof 화면앱 => {
      if (err instanceof ApiError && err.code === 'NOT_API_SERVICE') return 화면앱;
      throw err;
    }),
    [id],
  );
  const API앱 = 목록.data !== null && 목록.data !== 화면앱;
  const 최신 = API앱 ? (목록.data as ApiDocList).versions[0] : undefined;
  const 판 = 최신?.version;
  // 커버리지 · 원문은 버전이 있어야 뜻이 있다. 버전이 바뀌면(받기 · 첨부) 다시 읽는다
  const 덮음 = useAsync(() => (판 === undefined ? Promise.resolve(null) : apiDocApi.coverage(id)), [id, 판]);
  const 원문 = useAsync(() => (판 === undefined ? Promise.resolve(null) : apiDocApi.doc(id, 판).then((x) => x.doc)), [id, 판]);
  const [이력, set이력] = useState(버전 !== undefined);
  const [알림, set알림] = useState<{ ok: boolean; 글: string } | null>(null);
  const [받는중, set받는중] = useState<'fetch' | 'upload' | null>(null);
  const 파일칸 = useRef<HTMLInputElement>(null);
  // 보기는 작성 read, 받기 · 첨부는 작성 write (도메인/API §7). 서버가 다시 막는다
  const 쓰나 = 할수('작성요청');

  if (목록.error !== null) return <Failed error={목록.error} />;
  if (목록.data === null) return <Loading />;
  if (목록.data === 화면앱) return <API안내 설정보나={설정보나} />;
  const { docPath, docEnv, versions } = 목록.data;

  const 넣기 = async (어느: 'fetch' | 'upload', 일: () => Promise<{ version: number; created: boolean }>) => {
    set받는중(어느);
    set알림(null);
    try {
      const { version, created } = await 일();
      set알림({
        ok: true,
        글: created ? t('저장했습니다 (버전 {버전})', { 버전: version }) : t('현재 버전과 같아 새 버전을 만들지 않았습니다 (버전 {버전})', { 버전: version }),
      });
      await 목록.reload();
    } catch (err) {
      set알림({ ok: false, 글: message(err, 언어) });
    } finally {
      set받는중(null);
    }
  };

  const API수 = 덮음.data?.operations.length;
  return (
    <>
      <Head
        위치={t('PRD 관리')}
        제목={t('API 문서')}
        부제={
          최신 === undefined
            ? t('아직 API 문서가 없습니다')
            : [t('버전 {버전}', { 버전: 최신.version }), API수 === undefined ? null : t('API {건수}개', { 건수: API수 }), 받은곳(최신, t)]
                .filter((x) => x !== null)
                .join(' · ')
        }
        행동={
          <>
            {쓰나 ? (
              <a className="btn" href="#/authoring">
                {t('테스트 작성 요청')}
              </a>
            ) : null}
            {/* 문서 경로 · 기준 서버가 설정에 없으면 받을 곳이 없다 — 버튼 대신 파일 첨부만 남는다 */}
            {쓰나 && docPath !== null && docEnv !== null ? (
              <button className="btn ghost" disabled={받는중 !== null} onClick={() => void 넣기('fetch', () => apiDocApi.fetch(id))}>
                <기다림글자 중={받는중 === 'fetch'} 평소={t('문서 새로 받기')} 기다림={t('받는 중…')} />
              </button>
            ) : null}
            {쓰나 ? (
              <button className="btn ghost" disabled={받는중 !== null} onClick={() => 파일칸.current?.click()}>
                <기다림글자 중={받는중 === 'upload'} 평소={t('파일 첨부')} 기다림={t('올리는 중…')} />
              </button>
            ) : null}
            {versions.length === 0 ? null : (
              <button className="btn ghost" aria-expanded={이력} onClick={() => set이력(!이력)}>
                {t('버전 기록')}
              </button>
            )}
          </>
        }
      />
      <input
        ref={파일칸}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label={t('API 문서 파일')}
        onChange={(e) => {
          const 파일 = e.target.files?.[0];
          e.target.value = '';
          if (파일 !== undefined) void 넣기('upload', () => apiDocApi.upload(id, 파일));
        }}
      />
      {알림 === null ? null : (
        <p role="status" className={알림.ok ? 'prd-note' : 'prd-note bad'}>
          {알림.글}
        </p>
      )}
      {versions.length === 0 ? (
        <div className="screen">
          <div className="empty">
            {t('아직 API 문서가 없습니다')}
            {쓰나 ? <small>{t('문서 새로 받기로 기준 서버에서 받거나, 파일 첨부로 OpenAPI 3 JSON 파일을 올립니다')}</small> : null}
          </div>
        </div>
      ) : (
        <>
          {이력 ? <ApiDocVersions id={id} versions={versions} 연버전={버전} /> : null}
          <div className="prd-todo">
            {덮음.data === null ? null : <안거친응답카드 coverage={덮음.data} />}
          </div>
          {덮음.error !== null ? <Failed error={덮음.error} /> : 덮음.data === null ? <Loading /> : <전체API coverage={덮음.data} doc={원문.data} />}
        </>
      )}
    </>
  );
}
