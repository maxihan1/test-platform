// 모니터링 모드 — Linux /proc 에서 CPU · 메모리 · 디스크 I/O · 네트워크를 읽어 1초 차이로 바꾼다 (도메인/성능 §3.9 「서버 모니터링」)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ProcSnapshot {
  atMs: number;
  cpuIdle: number;
  cpuTotal: number;
  mem: number;
  diskSectors: number;
  netIn: number;
  netOut: number;
}

// 첫 줄 cpu 의 user nice system idle iowait irq softirq steal. guest 는 user 에 이미 들어 있어 더하지 않는다
export function parseStat(text: string): { idle: number; total: number } {
  const f = text.split('\n')[0].trim().split(/\s+/).slice(1, 9).map(Number);
  return { idle: f[3] + f[4], total: f.reduce((a, b) => a + b, 0) };
}

export function parseMeminfo(text: string): number {
  const kb = (key: string) => Number(new RegExp(`^${key}:\\s+(\\d+)`, 'm').exec(text)?.[1] ?? 0);
  const total = kb('MemTotal');
  return total ? ((total - kb('MemAvailable')) / total) * 100 : 0;
}

// 파티션까지 더하면 같은 I/O 를 두 번 센다 — 통디스크 이름만 고른다
const WHOLE_DISK = /^(sd[a-z]+|vd[a-z]+|xvd[a-z]+|hd[a-z]+|nvme\d+n\d+|mmcblk\d+)$/;

// 읽은 섹터(6번째 칸) + 쓴 섹터(10번째 칸). 섹터는 커널이 늘 512바이트로 센다
export function parseDiskstats(text: string): number {
  let sectors = 0;
  for (const line of text.split('\n')) {
    const f = line.trim().split(/\s+/);
    if (f.length >= 10 && WHOLE_DISK.test(f[2])) sectors += Number(f[5]) + Number(f[9]);
  }
  return sectors;
}

// lo 는 서버 안에서 도는 것이다. 컨테이너 브리지 · veth · 터널은 바깥 인터페이스를 지난 같은 요청을 또 센다(--network host 라 다 보인다).
// ponytail: 이름으로 거른다 — br0 처럼 손수 만든 브리지는 겹쳐 센다. /sys/devices/virtual/net 으로 가리면 LXC 안의 eth0(veth)을 0 으로 세서 이름을 골랐다
const NOT_OUTSIDE = /^(lo$|docker|br-|veth|virbr|cni|flannel|cali|tun|tap|wg|tailscale)/;

// 받은 바이트(첫 칸) · 보낸 바이트(아홉째 칸). 바깥 인터페이스만 센다
export function parseNetDev(text: string): { inBytes: number; outBytes: number } {
  let inBytes = 0;
  let outBytes = 0;
  for (const line of text.split('\n').slice(2)) {
    const [name, rest] = line.split(':');
    if (!rest || NOT_OUTSIDE.test(name.trim())) continue;
    const f = rest.trim().split(/\s+/).map(Number);
    inBytes += f[0];
    outBytes += f[8];
  }
  return { inBytes, outBytes };
}

export function readSnapshot(root = '/proc'): ProcSnapshot {
  const read = (name: string) => readFileSync(join(root, name), 'utf8');
  const cpu = parseStat(read('stat'));
  const net = parseNetDev(read('net/dev'));
  return {
    atMs: Date.now(),
    cpuIdle: cpu.idle,
    cpuTotal: cpu.total,
    mem: parseMeminfo(read('meminfo')),
    diskSectors: parseDiskstats(read('diskstats')),
    netIn: net.inBytes,
    netOut: net.outBytes,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function diff(a: ProcSnapshot, b: ProcSnapshot): { cpu: number; mem: number; diskIoKbps: number; netInKbps: number; netOutKbps: number } {
  const dt = Math.max(0.001, (b.atMs - a.atMs) / 1000);
  const dTotal = b.cpuTotal - a.cpuTotal;
  const kbps = (bytes: number) => round1(Math.max(0, bytes) / 1024 / dt);
  return {
    cpu: dTotal > 0 ? round1((1 - (b.cpuIdle - a.cpuIdle) / dTotal) * 100) : 0,
    mem: round1(b.mem),
    diskIoKbps: kbps((b.diskSectors - a.diskSectors) * 512),
    netInKbps: kbps(b.netIn - a.netIn),
    netOutKbps: kbps(b.netOut - a.netOut),
  };
}
