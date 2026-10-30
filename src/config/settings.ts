// Benutzereinstellungen (nur in diesem Browser gespeichert) und KI-Anbieter
import { lsGet } from '../lib/util';

export const TIERS: Record<string, string> = { quick: 'schnell', default: 'gründlich' };
// KI-Anbieter: Claude (über das Claude-Konto, im Artefakt) oder OpenRouter (Schlüssel aus der .env, in der lokalen App)
export const MODELS = ['anthropic/claude-haiku-5.5', 'openai/gpt-5.4-mini', 'google/gemini-3.1-flash-lite'];
export const PROVIDERS: Record<string, string> = { auto: 'automatisch', claude: 'Claude', openrouter: 'OpenRouter' };

export const tierOf = () => TIERS[lsGet('t9_tier')] ? lsGet('t9_tier') : 'quick';
export const providerPref = () => PROVIDERS[lsGet('t9_provider')] ? lsGet('t9_provider') : 'auto';
export const orModel = () => MODELS.includes(lsGet('t9_model')) ? lsGet('t9_model') : MODELS[0];

// OpenRouter in dieser Sitzung nicht erreichbar bzw. Kontingent erschöpft → auf Claude ausweichen
export const providerState = { orBlocked: false };

export function activeProvider(): 'claude' | 'openrouter' {
  const p = providerPref(); if (p === 'claude' || providerState.orBlocked) return 'claude';
  if (p === 'openrouter') return p;
  return lsGet('t9_key') ? 'openrouter' : 'claude';
}
export function providerLabel() {
  return activeProvider() === 'openrouter' ? 'OpenRouter · ' + orModel().split('/').pop() : 'Claude · ' + TIERS[tierOf()];
}
