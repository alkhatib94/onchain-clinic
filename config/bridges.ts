// config/bridges.ts

export type BridgeEntry = {
  /** Optional link to the bridge landing page */
  link: string;
  /**
   * A list of ON-BASE addresses (routers / spokes / pools / helpers)
   * If a tx's from/to/contractAddress matches any of these, we count it as a "use".
   * ALWAYS put addresses in lowercase. We'll normalize anyway.
   */
  contracts: string[];
};

/* ----------------------- Native (official Base bridge) ---------------------- */
export const NATIVE_BRIDGE: BridgeEntry = {
  link: "https://bridge.base.org/",
  contracts: [
    "0x4200000000000000000000000000000000000010", // L2StandardBridge
    "0x4200000000000000000000000000000000000007", // L2CrossDomainMessenger
    "0x4200000000000000000000000000000000000016", // L2ToL1MessagePasser
  ].map((a) => a.toLowerCase()),
};

export const NATIVE_BRIDGE_SENDERS_L2: string[] = [
  "0x4200000000000000000000000000000000000010", // L2StandardBridge (sender)
  "0x4200000000000000000000000000000000000007", // L2CrossDomainMessenger
  "0x4200000000000000000000000000000000000016", // L2ToL1MessagePasser
].map((a) => a.toLowerCase());

/* --------------------------- Third-party bridges ---------------------------- */
export const THIRD_PARTY_BRIDGES: Record<string, BridgeEntry> = {
  // === Bungee / Socket ===
  bungee: {
    link: "https://www.bungee.exchange/?toChain=Base",
    contracts: [
      "0x12E6e58864cE4402cF2B4B8a8E9c75eAD7280156", // Socket main router
      "0x957301825Dc21d4A92919C9E72dC9E6C6a29e7f8", // Socket Switchboard
    ].map((a) => a.toLowerCase()),
  },

  // === Jumper / LI.FI ===
  jumper: {
    link: "https://jumper.exchange/?toChain=Base",
    contracts: [
      "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE", // LI.FI Jumper main executor
    ].map((a) => a.toLowerCase()),
  },

  // === Across ===
  across: {
    link: "https://across.to/bridge",
    contracts: [
      "0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64", // Across Protocol: Base Spoke Pool Proxy
    ].map((a) => a.toLowerCase()),
  },

  // === Relay ===
  relay: {
    link: "https://www.relaychain.com/",
    contracts: [
      "0xF5042e6ffaC5a625D4E7848e0b01373D8eB9e222", // Relay bridge address (Base)
    ].map((a) => a.toLowerCase()),
  },

  // === Stargate ===
  stargate: {
    link: "https://stargate.finance/transfer",
    contracts: [
      "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd", // Stargate Router on Base
    ].map((a) => a.toLowerCase()),
  },
};

/* ----------------------------- Helper (optional) ---------------------------- */
export const BRIDGE_KEYS = Object.keys(THIRD_PARTY_BRIDGES);

export const THIRD_PARTY_BRIDGE_SETS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(THIRD_PARTY_BRIDGES).map(([k, v]) => [
    k,
    new Set(v.contracts.map((a) => a.toLowerCase())),
  ])
);
