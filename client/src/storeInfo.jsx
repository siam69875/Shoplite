import { createContext, useContext, useEffect, useState } from 'react';
import { api, money } from './api.js';

// Store settings (delivery charge, VAT, hotline, offers...) come from GET /api/store-info,
// which reads them from the server modules that enforce them. Never type these values into a page.
const StoreInfoContext = createContext(null);

export function StoreInfoProvider({ children }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    api('/store-info').then(setInfo).catch(() => {});
  }, []);
  return <StoreInfoContext.Provider value={info}>{children}</StoreInfoContext.Provider>;
}

// "a, b or c"
const joinWords = (words, last) =>
  words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} ${last} ${words.at(-1)}`;

const show = (value) => (value === undefined || value === null ? '—' : value);

/** Store settings with display-ready text. Shows "—" until loaded, never a guessed value. */
export function useStoreInfo() {
  const info = useContext(StoreInfoContext);
  const paymentMethods = info?.paymentMethods ?? [];
  return {
    loaded: Boolean(info),
    name: info?.storeName ?? '',
    region: info?.region ?? '',
    refundNote: info?.refundNote ?? '',
    paymentMethods,
    payWith: joinWords(paymentMethods.map((m) => m.label), 'or'),
    paymentBrands: joinWords(paymentMethods.flatMap((m) => m.brands), 'or'),
    methodInfo: (code) => paymentMethods.find((m) => m.method === code) ?? { method: code, label: code, account: 'account', brands: [] },
    maxQtyPerItem: info?.maxQtyPerItem ?? 1,
    offers: info?.offers ?? {},
    welcomeOffer: info ? info.offers[info.welcomeCoupon] ?? null : null,
    delivery: money(info?.deliveryCharge),
    deliveryDays: show(info?.deliveryDays),
    districtCount: show(info?.districtCount),
    vat: `${show(info?.vatPercent)}%`,
    refundDays: show(info?.refundWindowDays),
    perPoint: money(info?.takaPerPoint),
    hotline: show(info?.hotline),
    demoBkashOtp: show(info?.demoBkashOtp),
    maxQty: show(info?.maxQtyPerItem),
  };
}

export const offerText = (offer) => (offer.type === 'PERCENT' ? `${offer.value}% off` : `${money(offer.value)} off`);
