import { Customer } from './types';

/**
 * Checks whether the customer has enough address information to open in maps or copy.
 */
export function hasSufficientAddress(
  customer?: Partial<Pick<Customer, 'address' | 'locality' | 'city' | 'pincode' | 'landmark'>> | null
): boolean {
  if (!customer) return false;
  const parts = [
    customer.address,
    customer.locality,
    customer.landmark,
    customer.city,
    customer.pincode,
  ];
  return parts.some(p => {
    if (typeof p !== 'string') return false;
    const clean = p.trim().toLowerCase();
    return clean.length > 0 && clean !== 'undefined' && clean !== 'null';
  });
}

export interface FormatAddressOptions {
  multiline?: boolean;
  includeLandmarkLabel?: boolean;
}

/**
 * Returns a clean, human-readable address string without duplicate commas, blank lines,
 * or "undefined"/"null" text.
 */
export function formatCustomerAddress(
  customer?: Partial<Pick<Customer, 'address' | 'locality' | 'city' | 'pincode' | 'landmark'>> | null,
  options: FormatAddressOptions = {}
): string {
  if (!customer) return '';

  const clean = (val?: string | null): string => {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    const lower = trimmed.toLowerCase();
    if (lower === 'undefined' || lower === 'null') return '';
    // Strip redundant leading/trailing commas, periods, and whitespace
    return trimmed.replace(/^[,\s.-]+|[,\s.-]+$/g, '');
  };

  const address = clean(customer.address);
  const landmark = clean(customer.landmark);
  const locality = clean(customer.locality);
  const city = clean(customer.city);
  const pincode = clean(customer.pincode);

  if (options.multiline) {
    const lines: string[] = [];
    if (address) lines.push(address);
    if (landmark) {
      const landmarkText = options.includeLandmarkLabel !== false
        ? (landmark.toLowerCase().startsWith('near ') ? landmark : `Near ${landmark}`)
        : landmark;
      lines.push(landmarkText);
    }
    const areaParts = [locality, city].filter(Boolean);
    if (areaParts.length > 0) {
      lines.push(pincode ? `${areaParts.join(', ')} - ${pincode}` : areaParts.join(', '));
    } else if (pincode) {
      lines.push(pincode);
    }
    return lines.join('\n');
  }

  // Single line joined with comma
  const rawSegments: string[] = [];
  if (address) rawSegments.push(address);
  if (landmark) {
    const lm = landmark.toLowerCase().startsWith('near ') ? landmark : `Near ${landmark}`;
    rawSegments.push(lm);
  }
  if (locality) rawSegments.push(locality);
  if (city) rawSegments.push(city);
  if (pincode) rawSegments.push(pincode);

  // Eliminate duplicate or redundant segments (e.g. if address ends with locality or city)
  const segments: string[] = [];
  for (const seg of rawSegments) {
    if (!seg) continue;
    const lower = seg.toLowerCase();
    const isRedundant = segments.some(prev => {
      const prevLower = prev.toLowerCase();
      return prevLower === lower || prevLower.endsWith(lower) || lower.endsWith(prevLower);
    });
    if (!isRedundant) {
      segments.push(seg);
    }
  }

  return segments.join(', ');
}

/**
 * Returns a brief summary address suitable for list cards and table previews.
 * e.g. "Edappally, Kochi" or "Kakkanad" or "Flat 4B, Kochi"
 */
export function formatAddressSummary(
  customer?: Partial<Pick<Customer, 'address' | 'locality' | 'city' | 'pincode'>> | null
): string {
  if (!customer) return '';
  const locality = customer.locality?.trim();
  const city = customer.city?.trim();
  const address = customer.address?.trim();

  const isMeaningful = (s?: string) => s && s.toLowerCase() !== 'undefined' && s.toLowerCase() !== 'null';

  if (isMeaningful(locality) && isMeaningful(city)) {
    if (locality!.toLowerCase().includes(city!.toLowerCase())) {
      return locality!;
    }
    return `${locality}, ${city}`;
  }
  if (isMeaningful(locality)) return locality!;
  if (isMeaningful(city)) return city!;
  if (isMeaningful(address)) return address!;
  return '';
}

/**
 * Builds a Google Maps search URL from the customer's saved address fields using standard URL encoding.
 * Returns null if insufficient address information exists.
 * Does not invent coordinates or call any paid geocoding APIs.
 */
export function getGoogleMapsSearchUrl(
  customer?: Partial<Pick<Customer, 'address' | 'locality' | 'city' | 'pincode' | 'landmark'>> | null
): string | null {
  if (!hasSufficientAddress(customer)) return null;

  const addressText = formatCustomerAddress(customer);
  if (!addressText.trim()) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText.trim())}`;
}

/**
 * Copies text to clipboard safely with fallback for older browsers or permission denials.
 * Only returns success=true if the copy operation actually succeeds.
 */
export async function copyToClipboard(
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!text || !text.trim()) {
    return { success: false, error: 'No address text available to copy.' };
  }

  const cleanText = text.trim();

  // 1. Try modern Navigator Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(cleanText);
      return { success: true };
    } catch (err: any) {
      console.warn('navigator.clipboard.writeText failed, attempting document.execCommand fallback', err);
    }
  }

  // 2. Fallback: document.execCommand('copy') via temporary textarea
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = cleanText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        return { success: true };
      }
      return {
        success: false,
        error: 'Clipboard copy was blocked by the browser. Please select and copy manually.',
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        error: fallbackErr?.message || 'Unable to copy address to clipboard.',
      };
    }
  }

  return { success: false, error: 'Clipboard is not supported in this environment.' };
}
