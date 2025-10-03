// app/lib/basename.ts
import { createPublicClient, http, keccak256, parseAbi } from 'viem'
import { base, mainnet } from 'viem/chains'

// ====== بيئة العمل ======
const ALCHEMY_L2 = process.env.ALCHEMY_BASE_RPC!
const ALCHEMY_L1 = process.env.ALCHEMY_MAINNET_RPC || 'https://eth.llamarpc.com'

// ENS Registry على Base (من ريبو basenames)
const REGISTRY = (process.env.BASE_ENS_REGISTRY || '0xb94704422c2a1e396835a571837aa5ae53285a95').toLowerCase() as `0x${string}`
// Reverse namespace الصحيح على Base (L2)
const REVERSE_SUFFIX = (process.env.BASE_REVERSE_SUFFIX || '80002105.reverse').toLowerCase()

// Universal Resolver على L1 (من توثيق ENS)
const UNIVERSAL_RESOLVER_MAINNET = '0xaBd80E8a13596fEeA40Fd26fD6a24c3fe76F05fB'
// coinType الخاص بـ Base (convertEVMChainIdToCoinType(8453))
const BASE_COIN_TYPE = 214805n

const l2 = createPublicClient({ chain: base, transport: http(ALCHEMY_L2) })
const l1 = createPublicClient({ chain: mainnet, transport: http(ALCHEMY_L1) })

// ====== Utils: namehash/labelhash ======
function strToHex(s: string): `0x${string}` {
  const bytes = new TextEncoder().encode(s)
  let hex = '0x'
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex as `0x${string}`
}
function labelhash(label: string): `0x${string}` {
  return keccak256(strToHex(label.toLowerCase()))
}
function namehash(name: string): `0x${string}` {
  let node = '0x' + '00'.repeat(32) as `0x${string}`
  if (!name) return node
  const labels = name.toLowerCase().split('.').filter(Boolean).reverse()
  for (const l of labels) {
    const lh = labelhash(l)
    node = keccak256((node + lh.slice(2)) as `0x${string}`)
  }
  return node
}

// ABIs مصغرة
const RegistryAbi = [
  { inputs: [{ name: 'node', type: 'bytes32' }], name: 'resolver', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
] as const
const ResolverAbi = [
  { inputs: [{ name: 'node', type: 'bytes32' }], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
] as const
const UniversalResolverAbi = parseAbi([
  'function reverse(bytes lookupAddress, uint256 coinType) view returns (string primary, address resolver, address reverseResolver)',
])

/**
 * يرجّع basename (مثل dralkhatib.base.eth) لعنوان 0x.
 * يجرّب بالترتيب: UniversalResolver@L1 -> Registry@Base -> ensideas.
 */
export async function getBasenameFor(address: `0x${string}`): Promise<string | null> {
  // 1) Universal Resolver على L1 (موصى به من ENS)
  try {
    const [primary] = await l1.readContract({
      abi: UniversalResolverAbi,
      address: UNIVERSAL_RESOLVER_MAINNET as `0x${string}`,
      functionName: 'reverse',
      args: [address, BASE_COIN_TYPE],
    })
    if (typeof primary === 'string' && primary.toLowerCase().endsWith('.base.eth')) {
      return primary
    }
  } catch {
    // تجاهل ثم جرّب الأون-تشين على Base مباشرة
  }

  // 2) مباشرة على Base Registry باستخدام namespace الصحيح: <hexaddr>.80002105.reverse
  try {
    const node = namehash(`${address.toLowerCase().slice(2)}.${REVERSE_SUFFIX}`)
    const resolver = await l2.readContract({
      address: REGISTRY,
      abi: RegistryAbi,
      functionName: 'resolver',
      args: [node],
    }) as `0x${string}`

    if (resolver && resolver !== '0x0000000000000000000000000000000000000000') {
      const name = await l2.readContract({
        address: resolver,
        abi: ResolverAbi,
        functionName: 'name',
        args: [node],
      }) as string

      if (name && name.toLowerCase().endsWith('.base.eth')) return name
    }
  } catch {
    // تجاهل ثم جرّب fallback الأخير
  }

  // 3) Fallback: ensideas (حتى لا تتعطل الواجهة)
  try {
    const r = await fetch(`https://api.ensideas.com/ens/resolve/${address}`, { cache: 'no-store' })
    if (!r.ok) return null
    const j = await r.json().catch(() => null)
    const cand = (j?.name as string | undefined) || (j?.displayName as string | undefined) || null
    if (cand && cand.toLowerCase().endsWith('.base.eth')) return cand
  } catch { /* ignore */ }

  return null
}
