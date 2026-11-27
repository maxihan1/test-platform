// 마법사 1단계의 가져오기 셋 — E2E 녹화 · Swagger · JMeter·nGrinder 파일. 셋 다 AI 일을 맡겨 트랜잭션 목록을 받는다 (도메인/성능 §3.9 「시나리오 만들기 — 세 길」)

import { useState } from 'react';

import type { ServiceRow } from './api.js';
import { apiDocApi } from './apiDocApi.js';
import { 확인창 } from './ConfirmBox.js';
import { use말 } from './i18n.js';
import { 마지막서버 } from './layout.js';
import { perfApi, type 초안결과 } from './perfApi.js';
import { PerfStartConfirm } from './PerfStartConfirm.js';
import { scenarioApi } from './scenarioApi.js';
import { Failed, Loading, PLATFORM_LABEL, useAsync, 기다림글자 } from './ui.js';
import { usePerfJob } from './usePerfJob.js';

type 길 = 'RECORD' | 'SWAGGER' | 'FILE';

export function PerfImport({ service, 받음 }: { service: ServiceRow; 받음: (결과: 초안결과, jobId: number) => void }) {
  const t = use말();
  const [열린, set열린] = useState<길 | null>(null);
  // 파일을 고르면 업로드 전에 한 번 묻는다 — 가져오면 지금 트랜잭션 목록이 바뀐다 (2026-11-26 사용자 · DESIGN.md 「모달」 ①)
  const [고른파일, set고른파일] = useState<File | null>(null);
  const 일 = usePerfJob<초안결과>((결과, jobId) => {
    set열린(null);
    받음(결과, jobId);
  });

  const 단추 = (어느: 길, 글: string) => (
    <button type="button" className="btn ghost small" aria-expanded={열린 === 어느} disabled={일.도나} onClick={() => set열린(열린 === 어느 ? null : 어느)}>
      {글}
    </button>
  );

  return (
    <>
      <div className="perf-row">
        <span className="perf-faint">{t('가져오면 지금 트랜잭션 목록을 변경합니다')}</span>
        <div className="perf-acts">
          {단추('RECORD', t('E2E 녹화'))}
          {단추('SWAGGER', t('Swagger 가져오기'))}
          {단추('FILE', t('JMeter · nGrinder 가져오기'))}
        </div>
      </div>
      {일.도나 ? (
        <div className="perf-well" role="status">
          <기다림글자 중 평소="" 기다림={t('AI 가 트랜잭션 목록을 만드는 중입니다. 녹화는 몇 분 걸립니다')} />
        </div>
      ) : 열린 === 'RECORD' ? (
        <녹화칸 service={service} 맡기기={일.맡기기} />
      ) : 열린 === 'SWAGGER' ? (
        <스웨거칸 service={service} 맡기기={일.맡기기} />
      ) : 열린 === 'FILE' ? (
        <div className="perf-well">
          <label className="perf-field">
            {t('.jmx 또는 nGrinder 스크립트 파일')}
            <input
              type="file"
              accept=".jmx,.groovy,.py,.xml,.txt"
              onChange={(e) => {
                const 파일 = e.target.files?.[0];
                // 비워 둬야 실패한 뒤 같은 파일을 다시 골라도 onChange 가 선다
                e.target.value = '';
                if (파일 !== undefined) set고른파일(파일);
              }}
            />
          </label>
          <span className="perf-faint">{t('변환하지 못한 부분(BeanShell · 자바 코드)은 따로 보여 줍니다. 1MB까지 업로드할 수 있습니다')}</span>
        </div>
      ) : null}
      {일.오류 === null ? null : <p className="perf-err" role="alert">{일.오류}</p>}
      {고른파일 === null ? null : (
        <확인창
          제목={t('「{이름}」 파일로 트랜잭션 목록을 만들까요?', { 이름: 고른파일.name })}
          확인={t('가져오기§트랜잭션')}
          onClose={() => set고른파일(null)}
          on확인={() => {
            const 파일 = 고른파일;
            set고른파일(null);
            void 일.맡기기(() => perfApi.draftFile(service.id, 파일));
          }}
        >
          <p>{t('선택한 스크립트를 서버로 보내 트랜잭션 목록을 만듭니다. 지금 트랜잭션 목록은 남지 않지만 다른 파일을 업로드하면 다시 만들 수 있습니다')}</p>
        </확인창>
      )}
    </>
  );
}

type 맡기기 = (요청: () => Promise<{ jobId: number }>) => Promise<void>;

function 녹화칸({ service, 맡기기 }: { service: ServiceRow; 맡기기: 맡기기 }) {
  const t = use말();
  const 목록 = useAsync(() => scenarioApi.list(service.prefix), [service.prefix]);
  const [시나리오, set시나리오] = useState('');
  const [env, setEnv] = useState(() => 마지막서버(service.prefix, service.envs));
  const [까닭, set까닭] = useState<string | null>(null);
  const [묻나, set묻나] = useState(false);

  if (목록.error !== null) return <Failed error={목록.error} />;
  if (목록.data === null) return <Loading />;

  const 고른것 = 목록.data.items.find((it) => String(it.id) === 시나리오);

  function 시작누름() {
    const 빈칸 = 고른것 === undefined || env === '';
    set까닭(빈칸 ? t('E2E 시나리오와 대상 서버를 선택해 주세요') : null);
    set묻나(!빈칸);
  }

  function 시작() {
    set묻나(false);
    void 맡기기(() => perfApi.draft({ serviceId: service.id, from: 'RECORD', env, scenarioId: Number(시나리오) }));
  }

  return (
    <div className="perf-well">
      <div className="perf-fields">
        <label className="perf-field">
          {t('E2E 시나리오')}
          <select value={시나리오} onChange={(e) => set시나리오(e.target.value)}>
            <option value="">{t('선택')}</option>
            {목록.data.items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
        </label>
        <label className="perf-field">
          {t('대상 서버')}
          <select value={env} onChange={(e) => setEnv(e.target.value)}>
            <option value="">{t('선택')}</option>
            {service.envs.map((it) => (
              <option key={it.env} value={it.env}>
                {it.env}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn small" onClick={시작누름}>
          {t('녹화 시작')}
        </button>
      </div>
      <span className="perf-faint">{t('서버 테스트 실행기가 시나리오를 한 번 실행하며 오간 요청을 남깁니다. 이 실행은 실행 기록에 남지 않습니다')}</span>
      {까닭 === null ? null : <p className="perf-err">{까닭}</p>}
      {!묻나 || 고른것 === undefined ? null : (
        <PerfStartConfirm
          종류="RECORD"
          줄들={[
            { 이름: t('시나리오§이름'), 값: [`SC-${고른것.id} ${고른것.name}`, t('{수}단계', { 수: 고른것.partCount })].join(' · ') },
            { 이름: t('디바이스'), 값: t(PLATFORM_LABEL[고른것.platform]) },
            { 이름: t('대상 서버'), 값: env },
          ]}
          안내={t('시나리오를 대상 서버에서 한 번 실행합니다. 완료되면 현재 트랜잭션 목록이 녹화한 내용으로 변경됩니다')}
          onClose={() => set묻나(false)}
          on시작={시작}
        />
      )}
    </div>
  );
}

const 메서드들 = ['get', 'post', 'put', 'patch', 'delete'];

function 스웨거칸({ service, 맡기기 }: { service: ServiceRow; 맡기기: 맡기기 }) {
  const t = use말();
  // 가장 새 버전에서 고른다. 판을 고르는 칸은 두지 않는다 — 이전 버전으로 시나리오를 만들 일은 드물다
  const 문서 = useAsync(async () => {
    const { versions } = await apiDocApi.list(service.id);
    const 판 = versions[0];
    // 「없다」를 null 로 돌리면 「불러오는 중」과 갈리지 않는다 — 한 겹 싼다
    if (판 === undefined) return { 판: null };
    const { doc } = await apiDocApi.doc(service.id, 판.version);
    const 작업들 = Object.entries(doc.paths ?? {}).flatMap(([path, ops]) =>
      Object.entries(ops ?? {}).filter(([m]) => 메서드들.includes(m)).map(([method, op]) => ({ method: method.toUpperCase(), path, summary: op?.summary ?? '' })),
    );
    return { 판: { version: 판.version, 작업들 } };
  }, [service.id]);
  // 고른 차례가 곧 트랜잭션 차례다 (§3.9 「Swagger」 — 고른 API 의 차례를 정한다)
  const [고른, set고른] = useState<string[]>([]);
  const [까닭, set까닭] = useState<string | null>(null);
  const [묻나, set묻나] = useState(false);

  if (문서.error !== null) return <Failed error={문서.error} />;
  if (문서.data === null) return <Loading />;
  if (문서.data.판 === null) return <div className="perf-well perf-faint">{t('이 애플리케이션에 업로드한 API 문서가 없습니다. PRD 관리 › API 문서에서 먼저 업로드해 주세요')}</div>;
  const { version, 작업들 } = 문서.data.판;

  function 가져오기() {
    if (고른.length === 0) {
      set까닭(t('API 를 하나 이상 선택해 주세요'));
      return;
    }
    set묻나(true);
  }

  function 보내기() {
    set묻나(false);
    const operations = 고른.map((키) => {
      const [method = '', path = ''] = 키.split(' ');
      return { method, path };
    });
    void 맡기기(() => perfApi.draft({ serviceId: service.id, from: 'SWAGGER', apiDocVersion: version, operations }));
  }

  return (
    <div className="perf-well">
      <span className="perf-faint">{t('API 문서 버전 {번호} · 선택한 순서대로 트랜잭션이 만들어집니다 (50개까지)', { 번호: version })}</span>
      <div className="perf-picks">
        {작업들.map((op) => {
          const 키 = `${op.method} ${op.path}`;
          const 차례 = 고른.indexOf(키);
          return (
            <label key={키}>
              <input
                type="checkbox"
                checked={차례 >= 0}
                disabled={차례 < 0 && 고른.length >= 50}
                onChange={() => set고른(차례 >= 0 ? 고른.filter((it) => it !== 키) : [...고른, 키])}
              />{' '}
              {차례 >= 0 ? <b>{차례 + 1}. </b> : null}
              <span className="mono">{키}</span> {op.summary === '' ? null : <span className="perf-faint">{op.summary}</span>}
            </label>
          );
        })}
      </div>
      <div>
        <button type="button" className="btn small" onClick={가져오기}>
          {t('선택한 API 가져오기')}
        </button>
      </div>
      {까닭 === null ? null : <p className="perf-err">{까닭}</p>}
      {!묻나 ? null : (
        <확인창 제목={t('선택한 API {수}건으로 트랜잭션 목록을 만들까요?', { 수: 고른.length })} 확인={t('가져오기§트랜잭션')} onClose={() => set묻나(false)} on확인={보내기}>
          <p>{t('선택한 API 를 선택한 순서대로 트랜잭션으로 만듭니다. 지금 트랜잭션 목록은 남지 않지만 다시 가져오면 다시 만들 수 있습니다')}</p>
        </확인창>
      )}
    </div>
  );
}
