// 테스트 실행 › 호환성 › 세트 — 만들기와 고치기가 같은 화면이다 (도메인/호환성 §8.17 ②). 구획은 CompatSetParts.tsx

import { useEffect, useRef, useState } from 'react';

import { api, type EnvRow, type 앱종류 } from './api.js';
import { compatApi, type CompatPreview, type CompatSetDetail, type CompatSetDevice } from './compatApi.js';
import { CompatCasePick } from './CompatCasePick.js';
import { CompatDevicePick } from './CompatDevicePick.js';
import { CompatStart } from './CompatStart.js';
import { 세트주소 } from './CompatSets.js';
import { 디바이스구획, 예상구획, 커버리지구획, 케이스구획 } from './CompatSetParts.js';
import { Head } from './Head.js';
import { t as 번역, use말, use언어 } from './i18n.js';
import { 떠나기로했다, 떠나기상자 } from './leaveGuard.js';
import { Failed, Loading, message, useAsync } from './ui.js';

interface 고칠것 {
  name: string;
  onePerModel: boolean;
  devices: CompatSetDevice[];
  addedCases: string[];
}

const 빈세트: 고칠것 = { name: '', onePerModel: true, devices: [], addedCases: [] };
const 본뜨기 = (d: CompatSetDetail): 고칠것 => ({ name: d.name, onePerModel: d.onePerModel, devices: d.devices, addedCases: d.addedCases });
const 같나 = (a: 고칠것, b: 고칠것) => JSON.stringify(a) === JSON.stringify(b);

export function CompatSet({ id, serviceId, service, kind, envs, 쓰나 }: { id: number | 'new'; serviceId: number; service: string; kind?: 앱종류; envs: readonly EnvRow[]; 쓰나: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const 웹 = kind === undefined || kind === 'SCREEN';
  // 새 세트는 빈 직접 추가로 미리 센 것이 첫 셈이다
  // 세트 상세는 애플리케이션을 안 준다 — 띠의 애플리케이션 세트 목록에 없으면 다른 애플리케이션의 세트다. 그대로 고치면 남의 케이스로 세고 저장은 서버가 거절한다
  const 처음 = useAsync(async () => {
    if (id === 'new') return { 상세: null, 셈: await compatApi.preview(serviceId, []), 남의것: false };
    const [상세, 목록] = await Promise.all([compatApi.set(id), compatApi.sets(serviceId)]);
    return { 상세, 셈: null, 남의것: !목록.sets.some((s) => s.id === id) };
  }, [id, serviceId]);
  const 팜 = useAsync(() => compatApi.devices(), []);

  const [저장본, set저장본] = useState<고칠것 | null>(null);
  const [지금, set지금] = useState(빈세트);
  const [셈, set셈] = useState<CompatPreview | null>(null);
  // null 은 카탈로그에 없는 케이스다 — 지웠거나 끈 직접 추가는 세트에 남고 실행 때 건너뛴다 (§3.13 「호환성 세트」)
  const [이름들, set이름들] = useState<Map<string, string | null>>(new Map());
  const [이름오류, set이름오류] = useState<string | null>(null);
  // 미리 셈은 늦게 온 앞 응답이 새 셈을 덮지 않게 마지막 것만 받는다
  const 셈차례 = useRef(0);
  const [창, set창] = useState<'디바이스' | '케이스' | '실행' | null>(null);
  const [오류, set오류] = useState<string | null>(null);
  const [저장중, set저장중] = useState(false);

  useEffect(() => {
    if (처음.data === null) return;
    const 본 = 처음.data.상세 === null ? 빈세트 : 본뜨기(처음.data.상세);
    set저장본(본);
    set지금(본);
    set셈(처음.data.상세 ?? 처음.data.셈);
    set이름들(new Map((처음.data.상세 ?? 처음.data.셈)!.auto.map((a) => [a.tcId, a.name])));
  }, [처음.data]);

  // 직접 추가한 케이스의 이름 — 세트는 번호만 저장한다. 자동 선택에 든 것은 이름이 이미 있다
  useEffect(() => {
    const 모름 = 지금.addedCases.filter((c) => !이름들.has(c));
    if (저장본 === null || 모름.length === 0) return;
    let 살았나 = true;
    Promise.all(모름.map((tcId) => api.cases({ service, q: tcId, platform: 웹 ? 'mobile' : 'android', page: 1 }).then((p) => [tcId, p.items.find((c) => c.tcId === tcId)?.name ?? null] as const)))
      .then((짝들) => {
        if (살았나) set이름들((앞) => new Map([...앞, ...짝들]));
      })
      .catch((err: unknown) => {
        // 이름만 못 읽은 것이라 화면은 번호로 그대로 쓴다. 다시 묻지 않게 빈 이름으로 채우고 까닭을 띄운다
        if (!살았나) return;
        set이름오류(번역('직접 추가한 케이스 이름을 읽지 못했습니다', 언어) + ' — ' + message(err, 언어));
        set이름들((앞) => new Map([...앞, ...모름.map((tcId) => [tcId, ''] as const)]));
      });
    return () => {
      살았나 = false;
    };
  }, [저장본, 지금.addedCases, 이름들, service, 언어, 웹]);

  if (처음.error !== null) return <Failed error={처음.error} />;
  if (처음.data === null || 저장본 === null || 셈 === null) return <Loading />;
  if (처음.data.남의것) {
    return (
      <div className="empty">
        {t('이 세트는 지금 고른 애플리케이션의 세트가 아닙니다')}
        <small>{t('세트 목록에서 다시 엽니다')}</small>
      </div>
    );
  }

  const 바뀜 = !같나(지금, 저장본);
  const 자동 = new Set(셈.auto.map((a) => a.tcId));
  const 직접 = 지금.addedCases.filter((c) => !자동.has(c));

  async function 케이스바꾸기(다음: string[]) {
    const 앞것 = 지금.addedCases;
    const 차례 = ++셈차례.current;
    set지금((앞) => ({ ...앞, addedCases: 다음 }));
    set오류(null);
    try {
      // 카탈로그에 없는(지웠거나 폰에서 안 도는) 직접 추가는 미리 셈에 안 보낸다 — 서버가 UNKNOWN_CASE 로 거절한다. 세트에는 남고 셈에서만 빠진다 (§3.13 「호환성 세트」)
      const 새셈 = await compatApi.preview(serviceId, 다음.filter((c) => 이름들.get(c) !== null));
      if (차례 === 셈차례.current) set셈(새셈);
    } catch (err) {
      if (차례 !== 셈차례.current) return;
      // 셈이 안 맞는 케이스 목록을 남기지 않는다 — 앞 목록으로 돌린다
      set지금((앞) => ({ ...앞, addedCases: 앞것 }));
      set오류(message(err, 언어));
    }
  }

  async function 저장() {
    set저장중(true);
    set오류(null);
    const 몸 = { serviceId, name: 지금.name.trim(), onePerModel: 지금.onePerModel, devices: 지금.devices.map((d) => ({ serial: d.serial })), addedCases: 지금.addedCases };
    try {
      if (id === 'new') {
        const { id: 새번호 } = await compatApi.create(몸);
        떠나기로했다();
        window.location.hash = 세트주소(새번호, service);
      } else {
        await compatApi.update(id, 몸);
        // 사본(기종명) · 예상 소요 시간은 서버가 다시 채운다
        await 처음.reload();
      }
    } catch (err) {
      set오류(message(err, 언어));
    } finally {
      set저장중(false);
    }
  }

  const 저장되나 = 쓰나 && !저장중 && (id === 'new' || 바뀜) && 지금.name.trim() !== '' && 지금.devices.length > 0;
  const 상세 = 처음.data.상세;

  return (
    <>
      <떠나기상자 막나={쓰나 && 바뀜} />
      <Head
        위치={t('테스트 실행 › 호환성')}
        제목={id === 'new' ? t('새 호환성 세트') : 저장본.name}
        행동={
          쓰나 ? (
            <>
              <button type="button" className={id === 'new' ? 'btn' : 'btn ghost'} disabled={!저장되나} onClick={() => void 저장()}>
                {t('저장')}
              </button>
              {/* 저장한 세트로만 돈다 — 고치는 중이면 서버의 세트와 화면이 달라 무엇이 돌지 헷갈린다 */}
              {id === 'new' ? null : (
                <button type="button" className="btn" disabled={바뀜} title={바뀜 ? t('저장한 뒤 실행합니다') : undefined} onClick={() => set창('실행')}>
                  {t('실행')}
                </button>
              )}
            </>
          ) : undefined
        }
      />
      <div className="screen compat-set">
        <p className="compat-back">
          <a href={`#/compat?service=${encodeURIComponent(service)}`}>{t('세트 목록으로')}</a>
        </p>
        <label className="compat-name-field">
          <span>{t('세트 이름')}</span>
          <input value={지금.name} maxLength={100} disabled={!쓰나} onChange={(e) => set지금((앞) => ({ ...앞, name: e.target.value }))} />
        </label>
        {오류 === null ? null : <p className="compat-err" role="alert">{오류}</p>}
        {이름오류 === null ? null : <p className="compat-err">{이름오류}</p>}
        <디바이스구획 고른={지금.devices} 팜={팜.data?.devices ?? null} 팜오류={팜.error} 쓰나={쓰나} 열기={() => set창('디바이스')} />
        <케이스구획
          auto={셈.auto}
          직접={직접}
          이름들={이름들}
          웹={웹}
          쓰나={쓰나}
          더하기={() => set창('케이스')}
          빼기={(tcId) => void 케이스바꾸기(지금.addedCases.filter((c) => c !== tcId))}
        />
        <커버리지구획 셈={셈} />
        <예상구획 예상={상세 !== null && !바뀜 ? 상세.estimate : null} 상태수={지금.devices.length} />
      </div>
      {창 === '디바이스' && 팜.data !== null ? (
        <CompatDevicePick
          목록={팜.data.devices}
          처음고른={지금.devices.map((d) => d.serial)}
          빠진={지금.devices.filter((d) => !팜.data!.devices.some((x) => x.serial === d.serial))}
          처음모델별={지금.onePerModel}
          닫기={() => set창(null)}
          완료={(고른, 모델별) => {
            // 사본은 서버가 저장할 때 다시 채운다. 팜에서 빠진 옛 디바이스는 옛 사본을 그대로 둔다
            const 팜사본 = new Map(팜.data!.devices.map((d) => [d.serial, { serial: d.serial, model: d.model, name: d.marketName ?? d.model }]));
            const 옛 = new Map(지금.devices.map((d) => [d.serial, d]));
            set지금((앞) => ({ ...앞, onePerModel: 모델별, devices: 고른.flatMap((s) => { const d = 팜사본.get(s) ?? 옛.get(s); return d === undefined ? [] : [d]; }) }));
            set창(null);
          }}
        />
      ) : null}
      {창 === '실행' && id !== 'new' ? <CompatStart setId={id} service={service} envs={envs} 닫기={() => set창(null)} /> : null}
      {창 === '케이스' ? (
        <CompatCasePick
          service={service}
          platform={웹 ? 'mobile' : 'android'}
          이미={new Set([...자동, ...지금.addedCases])}
          닫기={() => set창(null)}
          완료={(고른) => {
            set이름들((앞) => new Map([...앞, ...고른.map((c) => [c.tcId, c.name] as const)]));
            void 케이스바꾸기([...지금.addedCases, ...고른.map((c) => c.tcId)]);
            set창(null);
          }}
        />
      ) : null}
    </>
  );
}
