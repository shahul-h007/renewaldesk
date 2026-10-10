'use client';

import React from 'react';
import {
  ChevronLeft,
  Video,
  Phone,
  MoreVertical,
  Plus,
  Camera,
  Mic,
  Smile,
  Wifi,
  User,
  MessageSquare,
} from 'lucide-react';

interface IPhone17ProMockupProps {
  customerName?: string | null;
  customerPhone?: string | null;
  customerAvatarUrl?: string | null;
  businessName?: string;
  messageText?: string;
  timeString?: string;
  onlineStatus?: string;
  className?: string;
}

/**
 * Computes up to 2 uppercase initials from a contact name.
 */
function getContactInitials(name?: string | null): string {
  if (!name || !name.trim()) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function IPhone17ProMockup({
  customerName,
  customerPhone,
  customerAvatarUrl,
  businessName,
  messageText,
  timeString = '10:14 AM',
  onlineStatus = 'Online',
  className = '',
}: IPhone17ProMockupProps) {
  const initials = getContactInitials(customerName);
  const hasCustomer = Boolean(customerName && customerName.trim());
  const hasMessage = Boolean(messageText && messageText.trim());

  return (
    <div className={`relative mx-auto w-full max-w-[290px] ${className}`}>
      {/* 
        iPhone 17 Pro Physical Specifications:
        - Width: 71.9 mm
        - Height: 150.0 mm
        - Aspect Ratio: 71.9 / 150 ≈ 0.47933
      */}
      <div
        className="relative w-full rounded-[48px] p-[4px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.45),0_12px_24px_-8px_rgba(15,23,42,0.3),0_0_0_1px_rgba(255,255,255,0.15)] bg-gradient-to-b from-[#333d4b] via-[#1a222c] to-[#0c1017] transition-all duration-300"
        style={{ aspectRatio: '71.9 / 150' }}
      >
        {/* Hardware Side Buttons */}
        {/* Left Side: Action Button */}
        <div
          aria-hidden="true"
          className="absolute -left-[3px] top-[18%] w-[3px] h-[20px] rounded-l-xs bg-[#2b3543] border-l border-white/20 shadow-xs"
        />
        {/* Left Side: Volume Up */}
        <div
          aria-hidden="true"
          className="absolute -left-[3px] top-[25%] w-[3px] h-[38px] rounded-l-xs bg-[#2b3543] border-l border-white/20 shadow-xs"
        />
        {/* Left Side: Volume Down */}
        <div
          aria-hidden="true"
          className="absolute -left-[3px] top-[34%] w-[3px] h-[38px] rounded-l-xs bg-[#2b3543] border-l border-white/20 shadow-xs"
        />

        {/* Right Side: Side/Power Button */}
        <div
          aria-hidden="true"
          className="absolute -right-[3px] top-[26%] w-[3px] h-[48px] rounded-r-xs bg-[#2b3543] border-r border-white/20 shadow-xs"
        />
        {/* Right Side: Camera Control (Capacitive Button) */}
        <div
          aria-hidden="true"
          className="absolute -right-[2.5px] top-[66%] w-[2.5px] h-[30px] rounded-r-xs bg-[#1f2733] border-r border-white/10 shadow-xs"
        />

        {/* Aluminum Unibody Outer Chamfer & Specular Ring */}
        <div
          aria-hidden="true"
          className="absolute inset-[1px] rounded-[46px] border border-white/15 pointer-events-none"
        />

        {/* Edge-to-Edge Front Bezel (Ceramic Shield 2 Display Border) */}
        <div className="relative w-full h-full rounded-[44px] bg-black p-[3.5px] flex flex-col overflow-hidden">
          {/* OLED Screen Area */}
          <div className="relative w-full h-full rounded-[40px] bg-[#EFEAE2] overflow-hidden flex flex-col select-none">
            {/* Ceramic Shield Glass Reflection Glare */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.08] pointer-events-none z-30 rounded-[40px]"
            />

            {/* iOS Status Bar + Dynamic Island */}
            <div className="relative w-full h-[40px] shrink-0 z-20 flex items-center justify-between px-5 text-gray-900">
              {/* iOS Time (SF Pro style) */}
              <span className="text-[11px] font-semibold tracking-tight text-gray-950 font-sans pt-1">
                9:41
              </span>

              {/* Dynamic Island (iPhone 17 Pro Proportional Pill) */}
              <div
                aria-label="Dynamic Island"
                className="absolute left-1/2 -translate-x-1/2 top-[8px] w-[86px] h-[25px] bg-black rounded-full flex items-center justify-between px-2.5 shadow-md"
              >
                {/* Camera Lens Specular Dot */}
                <div className="w-2.5 h-2.5 rounded-full bg-[#0d1424] ring-1 ring-white/10 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-[#1e2a4a]/90" />
                </div>
                {/* TrueDepth Sensor Dot */}
                <div className="w-1.5 h-1.5 rounded-full bg-[#0a0e1a]/90" />
              </div>

              {/* iOS System Icons (Cellular, Wi-Fi, Battery) */}
              <div className="flex items-center gap-1.5 pt-1 text-gray-950">
                {/* Cellular 4-bar indicator */}
                <svg
                  className="w-3.5 h-3"
                  viewBox="0 0 17 12"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="1" y="9" width="2.5" height="3" rx="0.5" />
                  <rect x="5" y="6" width="2.5" height="6" rx="0.5" />
                  <rect x="9" y="3" width="2.5" height="9" rx="0.5" />
                  <rect x="13" y="0" width="2.5" height="12" rx="0.5" />
                </svg>

                {/* Wi-Fi Icon */}
                <Wifi className="w-3 h-3 stroke-[2.4]" aria-hidden="true" />

                {/* Battery Indicator with Positive Terminal */}
                <div className="flex items-center" aria-hidden="true">
                  <div className="w-[18px] h-[9px] rounded-[3px] border border-gray-950 p-[1px] flex items-center">
                    <div className="w-[12px] h-[5px] rounded-[1.5px] bg-gray-950" />
                  </div>
                  <div className="w-[1px] h-[3px] bg-gray-950 rounded-r-xs -ml-[0.5px]" />
                </div>
              </div>
            </div>

            {/* WhatsApp Conversation Header: Represents the Customer recipient */}
            <header className="bg-[#075E54] text-white px-2.5 py-1.5 flex items-center justify-between shadow-xs z-10 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Back"
                  className="p-0.5 text-emerald-100 hover:text-white shrink-0"
                >
                  <ChevronLeft className="w-4 h-4 -mr-1" />
                </button>
                <div className="relative shrink-0">
                  <div className="w-7 h-7 rounded-full bg-slate-700 border border-white/20 flex items-center justify-center text-[10.5px] font-bold text-white shadow-2xs overflow-hidden">
                    {customerAvatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={customerAvatarUrl}
                        alt={customerName || 'Customer'}
                        className="w-full h-full object-cover"
                      />
                    ) : initials ? (
                      initials
                    ) : (
                      <User className="w-3.5 h-3.5 text-gray-300" />
                    )}
                  </div>
                  {hasCustomer && (
                    <span
                      title="Online"
                      className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#075E54]"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 ml-0.5">
                  <h3
                    className="text-[11.5px] font-bold leading-tight truncate text-white"
                    title={customerName || 'Select Contact'}
                  >
                    {customerName || 'Select Contact'}
                  </h3>
                  <p className="text-[9.5px] text-emerald-200 leading-tight truncate">
                    {hasCustomer ? onlineStatus : 'No active contact'}
                  </p>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-2 text-emerald-100 shrink-0">
                <Video className="w-3.5 h-3.5" aria-hidden="true" />
                <Phone className="w-3 h-3" aria-hidden="true" />
                <MoreVertical className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            </header>

            {/* WhatsApp Chat Canvas */}
            {hasCustomer && hasMessage ? (
              <div className="flex-1 px-3 py-2.5 overflow-y-auto flex flex-col justify-end space-y-2 relative bg-[#EFEAE2]">
                {/* Subtle Authentic WhatsApp Doodle Background Tint */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#075e54_1px,transparent_1px)] [background-size:12px_12px]"
                />

                {/* Date Badge */}
                <div className="flex justify-center mb-1 relative z-10">
                  <span className="px-2 py-0.5 rounded-md bg-white/80 backdrop-blur-xs text-[9px] font-medium text-gray-500 shadow-2xs uppercase tracking-wider">
                    Today
                  </span>
                </div>

                {/* Outgoing Message Bubble (Sent by business to customer) */}
                <div className="relative z-10 max-w-[94%] ml-auto bg-[#DCF8C6] text-gray-900 rounded-2xl rounded-tr-xs px-3 py-2 shadow-xs border border-emerald-900/5 text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                  {/* Speech Bubble Corner Tail */}
                  <div
                    aria-hidden="true"
                    className="absolute -top-[1px] -right-[5px] w-2 h-2 border-t-[6px] border-t-[#DCF8C6] border-r-[6px] border-r-transparent pointer-events-none"
                  />

                  {/* Outgoing Message Content */}
                  <div className="text-gray-900 font-normal">
                    {messageText}
                  </div>

                  {/* Message Timestamp and Blue Delivery Checkmarks */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9.5px] text-gray-500 font-mono">
                    <span>{timeString}</span>
                    <span className="text-[#34B7F1] font-bold text-[10px]" title="Read">
                      ✓✓
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Clear Empty State (Requirement 8) */
              <div className="flex-1 px-4 py-6 flex flex-col items-center justify-center text-center relative bg-[#EFEAE2]">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#075e54_1px,transparent_1px)] [background-size:12px_12px]"
                />
                <div className="relative z-10 w-12 h-12 rounded-full bg-white/90 shadow-xs flex items-center justify-center mb-3 text-gray-400">
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                </div>
                <p className="relative z-10 text-xs font-semibold text-gray-700">
                  No Customer Selected
                </p>
                <p className="relative z-10 text-[10.5px] text-gray-500 mt-1 max-w-[200px] leading-relaxed">
                  Select a customer to preview the personalized WhatsApp notification message.
                </p>
              </div>
            )}

            {/* WhatsApp Message Composer */}
            <div className="bg-[#F0F2F5] px-2 py-1.5 flex items-center gap-1.5 border-t border-gray-200/80 shrink-0 z-10">
              <button
                type="button"
                tabIndex={-1}
                aria-label="Add attachment"
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <Plus className="w-4 h-4" />
              </button>

              <div className="flex-1 bg-white rounded-full px-2.5 py-1 text-[11px] text-gray-400 border border-gray-200 flex items-center justify-between shadow-2xs">
                <span className="truncate">Message...</span>
                <Smile className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
              </div>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Take photo"
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Send audio message"
                className="w-7 h-7 rounded-full bg-[#128C7E] flex items-center justify-center text-white shadow-xs"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* iOS Home Indicator Safe Area */}
            <div className="w-full bg-[#F0F2F5] pt-1 pb-1.5 flex justify-center shrink-0 z-10">
              <div
                aria-hidden="true"
                className="w-28 h-[3.5px] bg-black/40 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
