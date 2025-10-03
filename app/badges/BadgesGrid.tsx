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

type Props = {
  walletAge: number;
  txCount: number;
  activeDays: number;
  txTimestampsUTC: string[];
  mainnetLaunchUTC: string;
  holidayDatesUTC: string[];

  // القيم الأخرى الاختيارية
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

  // SpecialClinics-only (بدون sushi/pancake/limitless)
  uniswap?: number;
  aerodrome?: number;
  aave?: number;
  stargate?: number;
  metamask?: number;
  lendingAny?: boolean;
  matcha?: number;
};

export default function BadgesGrid(props: Props) {
  return (
    <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      <PatientHistory walletAge={props.walletAge} />
      <VitalSigns txCount={props.txCount} />
      <CheckupFrequency activeDays={props.activeDays} />

      <OnchainLifestyle
        txTimestampsUTC={props.txTimestampsUTC}
        mainnetLaunchUTC={props.mainnetLaunchUTC}
        holidayDatesUTC={props.holidayDatesUTC}
      />

      <TreatmentPlans uniqueContracts={props.uniqueContracts ?? 0} />
      <PrescriptionUsage
        swaps={props.swaps ?? 0}
        stablecoinTxs={props.stablecoinTxs ?? 0}
        usdcTrades={props.usdcTrades ?? 0}
        stablecoinTypes={props.stablecoinTypes ?? 0}
        maxSwapUsd={props.maxSwapUsd ?? 0}
      />

      <MedicationVariety erc20Count={props.erc20Count ?? 0} />
      <ImagingRecords nftCount={props.nftCount ?? 0} />
      <OnchainDosage totalVolumeEth={props.totalVolumeEth ?? 0} />

      <TreatmentCosts gasEth={props.gasEth ?? 0} />
      <Referrals
        usedThirdPartyBridge={props.usedThirdPartyBridge ?? false}
        usedNativeBridge={props.usedNativeBridge ?? false}
        relayCount={props.relayCount ?? 0}
        jumperCount={props.jumperCount ?? 0}
        bungeeCount={props.bungeeCount ?? 0}
        acrossCount={props.acrossCount ?? 0}
      />

      <MedicalStaff deployedContracts={props.deployedContracts ?? 0} />

      <SpecialClinics
        uniswap={props.uniswap ?? 0}
        aerodrome={props.aerodrome ?? 0}
        aave={props.aave ?? 0}
        stargate={props.stargate ?? 0}
        metamask={props.metamask ?? 0}
        lendingAny={props.lendingAny ?? false}
        matcha={props.matcha ?? 0}
      />
    </section>
  );
}
