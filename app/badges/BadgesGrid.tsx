// app/badges/BadgesGrid.tsx
"use client";

import PrescriptionUsage from "./PrescriptionUsage";
import TreatmentPlans from "./TreatmentPlans";
import MedicationVariety from "./MedicationVariety";
import ImagingRecords from "./ImagingRecords";
import OnchainDosage from "./OnchainDosage";
import TreatmentCosts from "./TreatmentCosts";
import Referrals from "./Referrals";
import MedicalStaff from "./MedicalStaff";
import SpecialClinics from "./SpecialClinics";
import PatientHistory from "./PatientHistory";
import VitalSigns from "./VitalSigns";
import CheckupFrequency from "./CheckupFrequency";
import OnchainLifestyle from "./OnchainLifestyle";

type Breakdown = {
  direct?: number;
  internal?: number;
  sample?: string[];
};

type Props = {
  walletAge: number;
  txCount: number;
  activeDays: number;

  txTimestampsUTC?: string[];
  mainnetLaunchUTC?: string;
  holidayDatesUTC?: string[];

  uniqueContracts?: number;
  swaps?: number;
  stablecoinTxs?: number;
  usdcTrades?: number;
  stablecoinTypes?: number;
  maxSwapUsd?: number;
  erc20Count?: number;
  nftCount?: number;
  totalVolumeEth?: number;
  gasEth?: number;

  usedThirdPartyBridge?: boolean;
  usedNativeBridge?: boolean;
  relayCount?: number;
  jumperCount?: number;
  bungeeCount?: number;
  acrossCount?: number;

  deployedContracts?: number;
  breakdown?: Breakdown;

  uniswap?: number;
  aerodrome?: number;
  aave?: number;
  stargate?: number;
  metamask?: number;
  lendingAny?: boolean;
  matcha?: number;
};

export default function BadgesGrid({
  walletAge,
  txCount,
  activeDays,

  txTimestampsUTC = [],
  mainnetLaunchUTC = "2023-08-09T00:00:00Z",
  holidayDatesUTC = [],

  uniqueContracts = 0,
  swaps = 0,
  stablecoinTxs = 0,
  usdcTrades = 0,
  stablecoinTypes = 0,
  maxSwapUsd = 0,
  erc20Count = 0,
  nftCount = 0,
  totalVolumeEth = 0,
  gasEth = 0,

  usedThirdPartyBridge = false,
  usedNativeBridge = false,
  relayCount = 0,
  jumperCount = 0,
  bungeeCount = 0,
  acrossCount = 0,

  deployedContracts = 0,
  breakdown,

  uniswap = 0,
  aerodrome = 0,
  aave = 0,
  stargate = 0,
  metamask = 0,
  lendingAny = false,
  matcha = 0,
}: Props) {
  return (
    <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      <PatientHistory walletAge={walletAge} />
      <VitalSigns txCount={txCount} />
      <CheckupFrequency activeDays={activeDays} />

      <OnchainLifestyle
        txTimestampsUTC={txTimestampsUTC}
        mainnetLaunchUTC={mainnetLaunchUTC}
        holidayDatesUTC={holidayDatesUTC}
      />

      <TreatmentPlans uniqueContracts={uniqueContracts} />
      <PrescriptionUsage
        swaps={swaps}
        stablecoinTxs={stablecoinTxs}
        usdcTrades={usdcTrades}
        stablecoinTypes={stablecoinTypes}
        maxSwapUsd={maxSwapUsd}
      />

      <MedicationVariety erc20Count={erc20Count} />
      <ImagingRecords nftCount={nftCount} />
      <OnchainDosage totalVolumeEth={totalVolumeEth} />

      <TreatmentCosts gasEth={gasEth} />
      <Referrals
        usedThirdPartyBridge={usedThirdPartyBridge}
        usedNativeBridge={usedNativeBridge}
        relayCount={relayCount}
        jumperCount={jumperCount}
        bungeeCount={bungeeCount}
        acrossCount={acrossCount}
      />

      <MedicalStaff
        deployedContracts={deployedContracts}
        breakdown={breakdown}
      />

      <SpecialClinics
        uniswap={uniswap}
        aerodrome={aerodrome}
        aave={aave}
        stargate={stargate}
        metamask={metamask}
        lendingAny={lendingAny}
        matcha={matcha}
      />
    </section>
  );
}
