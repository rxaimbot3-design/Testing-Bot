import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

// ================================================================
//  Crypto Test Vectors
//  These vectors verify that our native C++ engine computes
//  SHA-256, SHA-512, and CRC-32 correctly.
// ================================================================

const SHA256_VECTORS: Array<{ input: string; expected: string }> = [
  { input: "", expected: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
  { input: "abc", expected: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" },
  { input: "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
    expected: "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1" },
  { input: "a".repeat(1000000),
    expected: "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0" },
];

const SHA512_VECTORS: Array<{ input: string; expected: string }> = [
  { input: "abc",
    expected: "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f" },
  { input: "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
    expected: "204a8fc6dda82f0a0ced7beb8e08a41657c16ef468b228a8279be331a703c33596fd15c13b1b07f9aa1d3bea57789ca031ad85c7a71dd70354ec631238ca3445" },
];

const CRC32_VECTORS: Array<{ input: string; expected: string }> = [
  { input: "", expected: "00000000" },
  { input: "a", expected: "E8B7BE43" },
  { input: "abc", expected: "352441C2" },
  { input: "message digest", expected: "20159D7F" },
];

describe("C++ Engine: Crypto Test Vectors", () => {
  it("SHA-256 matches NIST test vectors", () => {
    for (const v of SHA256_VECTORS) {
      expect(createHash("sha256").update(v.input).digest("hex")).toBe(v.expected);
    }
  });

  it("SHA-512 matches NIST test vectors", () => {
    for (const v of SHA512_VECTORS) {
      expect(createHash("sha512").update(v.input).digest("hex")).toBe(v.expected);
    }
  });

  it("CRC-32 matches IEEE 802.3 reference values", () => {
    for (const v of CRC32_VECTORS) {
      // Reference implementation from Node.js zlib
      const expected = createHash("sha256").update(v.input).digest("hex");
      // We just verify our fallback JS implementation matches itself;
      // native CRC-32 is verified via CppNativeEngine below.
      const buf = Buffer.from(v.input, "utf8");
      let crc = 0xffffffff;
      for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
          crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
      }
      expect(((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0").toUpperCase()).toBe(v.expected);
    }
  });

  it("native C++ computeHash returns correct SHA-256", async () => {
    const { CppNativeEngine } = await import("../src/CppEngine.js");
    await CppNativeEngine.initEngine();
    const results = await CppNativeEngine.batchComputeHashes(
      SHA256_VECTORS.map(v => ({ data: v.input, algorithm: "sha256" as const }))
    );
    for (let i = 0; i < results.length; i++) {
      expect(results[i].hash).toBe(SHA256_VECTORS[i].expected);
    }
  });

  it("native C++ computeHash returns correct SHA-512", async () => {
    const { CppNativeEngine } = await import("../src/CppEngine.js");
    await CppNativeEngine.initEngine();
    const results = await CppNativeEngine.batchComputeHashes(
      SHA512_VECTORS.map(v => ({ data: v.input, algorithm: "sha512" as const }))
    );
    for (let i = 0; i < results.length; i++) {
      expect(results[i].hash).toBe(SHA512_VECTORS[i].expected);
    }
  });

  it("native C++ computeHash returns correct CRC-32", async () => {
    const { CppNativeEngine } = await import("../src/CppEngine.js");
    await CppNativeEngine.initEngine();
    const results = await CppNativeEngine.batchComputeHashes(
      CRC32_VECTORS.map(v => ({ data: v.input, algorithm: "crc32" as const }))
    );
    for (let i = 0; i < results.length; i++) {
      expect(results[i].hash.toUpperCase()).toBe(CRC32_VECTORS[i].expected);
    }
  });

  it("native C++ computeHash falls back to SHA-256 for unknown algorithm", async () => {
    const { CppNativeEngine } = await import("../src/CppEngine.js");
    await CppNativeEngine.initEngine();
    const results = await CppNativeEngine.batchComputeHashes([
      { data: "test", algorithm: "unknown" as any }
    ]);
    expect(results[0].hash).toBe(createHash("sha256").update("test").digest("hex"));
  });

  it("native C++ computeHash handles empty string", async () => {
    const { CppNativeEngine } = await import("../src/CppEngine.js");
    await CppNativeEngine.initEngine();
    const results = await CppNativeEngine.batchComputeHashes([
      { data: "", algorithm: "sha256" as const }
    ]);
    expect(results[0].hash).toBe(createHash("sha256").update("").digest("hex"));
  });
});
