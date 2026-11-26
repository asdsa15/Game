import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  pw: string | Buffer, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }
) => Promise<Buffer>;

/**
 * 口令散列用标准库 scrypt，不引 argon2。
 * 理由：argon2 要原生编译，Windows/CI 上装不上就是整条链路卡死；
 * scrypt 是 RFC 7914，Node 内置，参数可调，够用且零依赖风险。
 * 存储格式带参数，日后换算法可以渐进升级（verify 时读到旧参数即知）。
 */
const N = 16384;   // 2^14，约 16MB 内存
const R = 8;
const P = 1;
const KEYLEN = 64;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

const inRange = (v: number, lo: number, hi: number): boolean =>
  Number.isInteger(v) && v >= lo && v <= hi;

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  /* 参数必须先验范围再交给 scrypt：
     否则一个被改坏的散列串（或恶意构造的库记录）会让登录接口抛 RangeError 变 500。
     N 必须是 2 的幂，且给个上下限，免得 params 被写成天文数字把进程内存打爆。 */
  if (!inRange(n, 1024, 1 << 20) || (n & (n - 1)) !== 0) return false;
  if (!inRange(r, 1, 32) || !inRange(p, 1, 16)) return false;
  const salt = Buffer.from(parts[4] ?? '', 'base64');
  const expected = Buffer.from(parts[5] ?? '', 'base64');
  if (salt.length < 8 || !inRange(expected.length, 16, 128)) return false;
  try {
    const got = await scryptAsync(pw, salt, expected.length, { N: n, r, p });
    return got.length === expected.length && timingSafeEqual(got, expected);
  } catch {
    return false;
  }
}
