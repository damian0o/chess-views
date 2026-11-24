/** A message is plain text with {name} placeholders, or plural forms chosen by CLDR rules from `count`. */
export type Plural = { one: string; few?: string; many?: string; other: string };
export type Message = string | Plural;
