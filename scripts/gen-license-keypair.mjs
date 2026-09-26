#!/usr/bin/env node
// Yangi Ed25519 litsenziya kalit juftini yaratadi.
//
//   node scripts/gen-license-keypair.mjs
//
// Natija:
//   LICENSE_ED25519_SEED  → FAQAT backend serverdagi .env ga (hech qachon git'ga emas!)
//   PRAVA_LICENSE_PUBKEY  → desktop build muhiti (GitHub secret / build-windows.bat oldidan `set`)
//
// Seed'ni parol menejerida saqlang. Uni yo'qotsangiz, yangi juft yaratib,
// barcha mijozlarga aktivatsiya kodlarini qayta berishga to'g'ri keladi.
import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");

// PKCS8 DER oxirgi 32 bayt = seed; SPKI DER oxirgi 32 bayt = public key.
const seed = privateKey.export({ format: "der", type: "pkcs8" }).subarray(-32);
const pub = publicKey.export({ format: "der", type: "spki" }).subarray(-32);

console.log("LICENSE_ED25519_SEED=" + seed.toString("base64"));
console.log("PRAVA_LICENSE_PUBKEY=" + pub.toString("hex"));
