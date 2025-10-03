export const NATIVE_BRIDGE_SENDERS_L2 = [
  '0x4200000000000000000000000000000000000010'.toLowerCase()
];

export const THIRD_PARTY_BRIDGES = {
  superbridge: { link: 'https://superbridge.app/base', contracts: [] as string[] },
  orbiter: { link: 'https://www.orbiter.finance/?dstChain=Base', contracts: [] as string[] },
  stargate: { link: 'https://stargate.finance/transfer', contracts: [] as string[] },
  hop: { link: 'https://app.hop.exchange/#/send?token=ETH&sourceNetwork=ethereum&destNetwork=base', contracts: [] as string[] },
  gaszip: { link: 'https://www.gas.zip/base', contracts: [] as string[] },
  rhinofi: { link: 'https://app.rhino.fi/bridge', contracts: [] as string[] },
  relay_bungee: { link: 'https://www.bungee.exchange/?toChain=Base', contracts: [] as string[] },
  relay_link: { link: 'https://relay.link/', contracts: [] as string[] },
  native_deprecated: { link: 'https://bridge.base.org', contracts: [] as string[] }
};