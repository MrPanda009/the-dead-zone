'use client';

import React, { useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ZoneId, REGIONAL_STORIES } from './storyData';
import { getEmergencyProfile } from './touristEmergencyData';
import { generateQrMatrix, generateQrSvgPath } from './offlineQrCode';

export interface OfflineTouristPassModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Currently selected zone/district */
  zone: ZoneId;
  /** Close modal callback */
  onClose: () => void;
}

export const OfflineTouristPassModal: React.FC<OfflineTouristPassModalProps> = ({
  isOpen,
  zone,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const emergencyData = getEmergencyProfile(zone);
  const story = REGIONAL_STORIES[zone] || REGIONAL_STORIES.Wayanad;

  // Timestamp calculations
  const now = useMemo(() => new Date(), []);
  const validUntil = useMemo(() => {
    const d = new Date(now);
    d.setHours(d.getHours() + 72);
    return d;
  }, [now]);

  const generationTimestampStr = useMemo(
    () =>
      now.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' IST',
    [now]
  );

  const validUntilTimestampStr = useMemo(
    () =>
      validUntil.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' IST (72h Stale Horizon)',
    [validUntil]
  );

  // Plain text representation for offline QR code and clipboard copy
  const offlineTextPayload = useMemo(() => {
    return [
      `TERRA EMERGENCY PASS — ${emergencyData.districtName.toUpperCase()}, ${emergencyData.state.toUpperCase()}`,
      `Generated: ${generationTimestampStr} | Valid: 72h`,
      `Alert: ${emergencyData.currentAlertLevel} | Hazard: ${emergencyData.dominantHazardLabel}`,
      `--- HIGHER GROUND SHELTERS ---`,
      `1. ${emergencyData.higherGroundPoints[0].name}: ${emergencyData.higherGroundPoints[0].decimalCoords} (${emergencyData.higherGroundPoints[0].dmsCoords}) ${emergencyData.higherGroundPoints[0].distanceKm}km Bearing ${emergencyData.higherGroundPoints[0].bearing}`,
      `2. ${emergencyData.higherGroundPoints[1].name}: ${emergencyData.higherGroundPoints[1].decimalCoords} (${emergencyData.higherGroundPoints[1].dmsCoords}) ${emergencyData.higherGroundPoints[1].distanceKm}km Bearing ${emergencyData.higherGroundPoints[1].bearing}`,
      `--- EMERGENCY HOSPITALS ---`,
      `Primary: ${emergencyData.primaryHospital.name} (Ph: ${emergencyData.primaryHospital.emergencyPhone}) ${emergencyData.primaryHospital.coordinates} ${emergencyData.primaryHospital.distanceKm}km`,
      `Fallback: ${emergencyData.fallbackHospital.name} (Ph: ${emergencyData.fallbackHospital.emergencyPhone}) ${emergencyData.fallbackHospital.distanceKm}km`,
      `--- EMERGENCY HELPLINES ---`,
      `DDMA: ${emergencyData.emergencyContacts.ddmaEmergencyLine} | Police: ${emergencyData.emergencyContacts.localPoliceControl}`,
      `National: ${emergencyData.emergencyContacts.nationalEmergency} | Ambulance: ${emergencyData.emergencyContacts.ambulanceMedical} | State: ${emergencyData.emergencyContacts.stateDisasterControl}`,
      `NDRF: ${emergencyData.emergencyContacts.ndrfBattalionControl}`,
    ].join('\n');
  }, [emergencyData, generationTimestampStr]);

  // Generate QR SVG
  const qrSvg = useMemo(() => {
    try {
      const matrix = generateQrMatrix(offlineTextPayload);
      return generateQrSvgPath(matrix);
    } catch {
      return { path: '', size: 33 };
    }
  }, [offlineTextPayload]);

  useGSAP(
    () => {
      if (!isOpen || !cardRef.current) return;
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, scale: 0.94, y: 16 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power3.out' }
      );
    },
    { dependencies: [isOpen, zone] }
  );

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(offlineTextPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Offline Tourist Emergency Pass"
    >
      {/* Background click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Main Printable Emergency Card Container */}
      <div
        ref={cardRef}
        id="offline-emergency-pass-print"
        className="relative z-10 max-w-2xl w-full bg-white text-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col my-auto transition-all"
      >
        {/* Action Bar (Hidden when printing via @media print) */}
        <div className="print:hidden flex items-center justify-between px-4 py-2.5 bg-zinc-900 text-white border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-base">
              offline_pin
            </span>
            <span className="text-xs font-mono font-bold tracking-wider">
              OFFLINE EMERGENCY PASS • SAVE BEFORE ENTERING VALLEY
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-2.5 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1 text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">print</span>
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 1. HEADER: District, State, Photo, Generation & Valid Until */}
        {/* ============================================================== */}
        <div className="relative w-full h-32 sm:h-36 overflow-hidden bg-zinc-900 text-white">
          <Image
            src={story.previewImage}
            alt={`${emergencyData.districtName} landscape`}
            fill
            sizes="800px"
            priority
            className="object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30" />

          <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-600/90 text-white font-mono text-[10px] font-bold tracking-widest uppercase">
                  TERRA CIVILIAN RESILIENCE
                </span>
                <span className="text-[10px] font-mono text-zinc-300">
                  REF: SETU-TOURIST-{zone.toUpperCase()}
                </span>
              </div>

              {/* Status Pill */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  emergencyData.currentAlertLevel === 'Normal'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : emergencyData.currentAlertLevel === 'Monitored'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                    : 'bg-red-500/30 text-red-200 border-red-400/60 animate-pulse'
                }`}
              >
                ● {emergencyData.currentAlertLevel} ALERT
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  {emergencyData.districtName}
                </h2>
                <span className="text-xs font-mono text-zinc-300">
                  {emergencyData.state}, India
                </span>
              </div>

              <div className="text-right font-mono text-[10px] sm:text-[11px] text-zinc-300 leading-tight">
                <div>Gen: {generationTimestampStr}</div>
                <div className="text-amber-300 font-semibold">
                  Valid Until: {validUntilTimestampStr}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body - Highly Dense, Crisp Single-Page Card Layout */}
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 text-xs text-zinc-800 bg-white">
          {/* ============================================================== */}
          {/* 2. CURRENT HAZARD STATUS & 72H FORECAST FLAG */}
          {/* ============================================================== */}
          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
                DOMINANT HAZARD & 72-HOUR OUTLOOK
              </span>
              <span className="text-xs font-bold text-zinc-900">
                {emergencyData.dominantHazardLabel}
              </span>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                {emergencyData.forecast72hFlag}
              </p>
            </div>
            <div className="shrink-0 px-2 py-1 rounded bg-zinc-200/80 text-[10px] font-mono text-zinc-700 font-semibold">
              Road: {emergencyData.roadConditionNotice.split('•')[0]}
            </div>
          </div>

          {/* ============================================================== */}
          {/* 3. TWO NEAREST HIGHER-GROUND SAFE HAVENS */}
          {/* ============================================================== */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-emerald-700">
                  terrain
                </span>
                TWO NEAREST VERIFIED HIGHER-GROUND POINTS (SAFE HAVENS)
              </span>
              <span className="text-[9px] font-mono text-zinc-500 italic">
                Screened, not field-verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {emergencyData.higherGroundPoints.map((haven, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between gap-1"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-zinc-900 text-xs">
                      #{idx + 1} {haven.name}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-emerald-800">
                      {haven.distanceKm} km • {haven.bearing}
                    </span>
                  </div>

                  <div className="font-mono text-[10px] text-zinc-600 leading-tight">
                    <div>Dec: {haven.decimalCoords}</div>
                    <div>DMS: {haven.dmsCoords}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">
                      Elevation: ~{haven.elevationMeters}m MSL
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================== */}
          {/* 4. NEAREST FLOOD-SAFE HOSPITAL & FALLBACK */}
          {/* ============================================================== */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-800 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-blue-700">
                local_hospital
              </span>
              NEAREST 24/7 FLOOD-SAFE HOSPITALS & EMERGENCY ROOMS
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Primary Hospital */}
              <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between gap-1">
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-zinc-900 text-xs">
                      {emergencyData.primaryHospital.name}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-blue-800">
                      {emergencyData.primaryHospital.distanceKm} km
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-600 block">
                    {emergencyData.primaryHospital.address}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-700 pt-1 border-t border-blue-200/60">
                  <span className="font-bold text-blue-900">
                    ER: {emergencyData.primaryHospital.emergencyPhone}
                  </span>
                  <span>24/7 ER • Blood Bank</span>
                </div>
              </div>

              {/* Fallback Hospital */}
              <div className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col justify-between gap-1">
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-zinc-900 text-xs">
                      Fallback: {emergencyData.fallbackHospital.name}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-600">
                      {emergencyData.fallbackHospital.distanceKm} km
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-600 block">
                    {emergencyData.fallbackHospital.address}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-700 pt-1 border-t border-zinc-200">
                  <span className="font-bold text-zinc-900">
                    Ph: {emergencyData.fallbackHospital.emergencyPhone}
                  </span>
                  <span>Secondary Casualty Station</span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 5. EMERGENCY NUMBERS BLOCK (NATIONAL + DDMA DISTRICT) */}
          {/* ============================================================== */}
          <div className="p-2.5 rounded-xl bg-zinc-900 text-white flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="font-bold text-emerald-400 uppercase tracking-wider">
                DISTRICT & NATIONAL DISASTER HELPLINES
              </span>
              <span>Verified: {emergencyData.emergencyContacts.lastVerifiedDate}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="flex flex-col">
                <span className="text-zinc-400 text-[9px]">DDMA Control:</span>
                <span className="font-bold text-emerald-300">
                  {emergencyData.emergencyContacts.ddmaEmergencyLine}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-zinc-400 text-[9px]">Police Control:</span>
                <span className="font-bold text-white">
                  {emergencyData.emergencyContacts.localPoliceControl}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-zinc-400 text-[9px]">National Emergency:</span>
                <span className="font-bold text-white">
                  {emergencyData.emergencyContacts.nationalEmergency} / Amb: 108
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-zinc-400 text-[9px]">NDRF Battalion:</span>
                <span className="font-bold text-zinc-200 text-[10px]">
                  {emergencyData.emergencyContacts.ndrfBattalionControl.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 6. HAZARD-SPECIFIC CHECKLIST */}
          {/* ============================================================== */}
          <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-900 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-amber-700">
                checklist
              </span>
              ESSENTIAL SAFETY CHECKLIST ({emergencyData.hazardChecklist.title})
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              {emergencyData.hazardChecklist.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1">
                  <span className="font-bold text-amber-900 shrink-0">✓</span>
                  <div>
                    <span className="font-semibold text-zinc-900">
                      {item.tag}:{' '}
                    </span>
                    <span className="text-zinc-700">{item.rule}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================== */}
          {/* 7 & 8. FILL-IN HANDWRITTEN BOX & OFFLINE QR CODE */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 border-t border-zinc-200 items-center">
            {/* 7. Fill-in Box (To be filled by hand on printout) */}
            <div className="sm:col-span-8 p-2.5 rounded-xl border border-dashed border-zinc-400 bg-zinc-50 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[9px] font-mono uppercase text-zinc-500 font-bold">
                <span>HANDWRITTEN TOURIST IDENTIFICATION (FILL ON PRINT)</span>
                <span>KEEP IN WALLET / VEHICLE DASH</span>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono text-zinc-700">
                <div className="border-b border-zinc-300 pb-0.5">
                  Name: ______________________
                </div>
                <div className="border-b border-zinc-300 pb-0.5">
                  Blood Group: ____________
                </div>
                <div className="border-b border-zinc-300 pb-0.5">
                  Hotel / Homestay: ___________
                </div>
                <div className="border-b border-zinc-300 pb-0.5">
                  Vehicle Reg #: ____________
                </div>
                <div className="col-span-2 border-b border-zinc-300 pb-0.5">
                  Emergency Contact & Phone: _______________________________
                </div>
              </div>
            </div>

            {/* 8. Pure Offline SVG QR Code */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center p-2 rounded-xl border border-zinc-200 bg-zinc-50 text-center">
              <svg
                viewBox={`0 0 ${qrSvg.size} ${qrSvg.size}`}
                className="w-20 h-20 bg-white p-1 rounded-lg border border-zinc-200 shadow-2xs"
                shapeRendering="crispEdges"
              >
                <path d={qrSvg.path} fill="#09090b" />
              </svg>
              <span className="text-[9px] font-mono text-zinc-500 mt-1 uppercase font-semibold">
                SCAN OFFLINE QR
              </span>
              <span className="text-[8px] text-zinc-400 leading-none">
                Coordinates & DDMA contacts
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineTouristPassModal;
