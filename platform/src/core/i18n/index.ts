/**
 * Messages for the interface: typed keys, {name} placeholders, CLDR plurals via Intl.PluralRules,
 * and English as the fallback for a key a language does not have yet.
 */
import type { Locale } from '../types';
import { LOCALES } from '../types';
import type { Message } from './types';
import { en } from './messages/en';
import { pl } from './messages/pl';

export type MessageKey = keyof typeof en;
export type Params = Record<string, string | number>;
type Catalogues = { en: Record<MessageKey, Message> } & Partial<Record<Locale, Partial<Record<MessageKey, Message>>>>;

const fill = (text: string, params: Params) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));

function pick(message: Message, locale: Locale, params: Params): string {
  if (typeof message === 'string') return message;
  const count = Number(params.count ?? 0);
  const form = new Intl.PluralRules(locale).select(count) as keyof typeof message;
  return message[form] ?? message.other;
}

/** A translator over the given catalogues (the app uses `t`; tests build their own). */
export function makeTranslator(catalogues: Catalogues) {
  return (locale: Locale, key: MessageKey, params: Params = {}): string => {
    const message = catalogues[locale]?.[key] ?? catalogues.en[key];
    return fill(pick(message, catalogues[locale]?.[key] ? locale : 'en', params), params);
  };
}

export const t = makeTranslator({ en, pl });

/** Keys the locale lacks (falling back to English); [] when complete. */
export function missingKeys(locale: Locale): MessageKey[] {
  const cat: Partial<Record<MessageKey, Message>> = { en, pl }[locale];
  return (Object.keys(en) as MessageKey[]).filter((k) => !(k in cat));
}

export { LOCALES };
