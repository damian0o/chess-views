import { useState } from 'react';
import { useLocation } from 'wouter';
import { Dialog, Heading, Input, Label, Modal, ModalOverlay, TextField } from 'react-aria-components';
import type { AgeBand, Locale, Profile } from '@core/types';
import { useApp } from '../appStore';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { Choice } from '../ui/Choice';
import { TopBar } from '../ui/TopBar';

/** The player's settings: name, age band, language, look, light/dark, save/load to a file, remove. */
export function Settings() {
  const t = useT();
  const [, navigate] = useLocation();
  const player = useApp((s) => s.player);
  const update = useApp((s) => s.updatePlayer);
  const remove = useApp((s) => s.removePlayer);
  const exportPlayer = useApp((s) => s.exportPlayer);
  const importPlayer = useApp((s) => s.importPlayer);
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(player?.name ?? '');
  if (!player) return null;

  const ageLabel = (a: AgeBand) => t(a === 'kids' ? 'age8to12' : a === 'teens' ? 'age12to16' : 'ageAdult');
  const download = async () => {
    const blob = await exportPlayer();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `chess-views-${player.name ?? 'player'}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <TopBar title={t('settings')} />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
        <TextField value={name} onChange={setName} onBlur={() => { if (name.trim()) void update({ name: name.trim() }); }} className="flex flex-col gap-1">
          <Label className="font-bold">{t('playerName')}</Label>
          <Input className="rounded-control bg-card px-4 py-3 text-lg ring-2 ring-ink/15" />
        </TextField>
        <Choice label={t('ageBand')} value={player.age}
          onChange={(age) => void update({ age, theme: { ...player.theme, family: age } })}
          options={(['kids', 'teens', 'adults'] as const).map((a) => ({ value: a, label: ageLabel(a) }))} />
        <Choice label={t('language')} value={player.locale} onChange={(locale: Locale) => void update({ locale })}
          options={[{ value: 'pl', label: t('langPl') }, { value: 'en', label: t('langEn') }]} />
        <Choice label={t('themeFamily')} value={player.theme.family} onChange={(family) => void update({ theme: { ...player.theme, family } })}
          options={[{ value: 'kids', label: t('lookKids') }, { value: 'teens', label: t('lookTeens') }, { value: 'adults', label: t('lookAdults') }]} />
        <Choice label={t('themeMode')} value={player.theme.mode} onChange={(mode: Profile['theme']['mode']) => void update({ theme: { ...player.theme, mode } })}
          options={[{ value: 'light', label: t('modeLight') }, { value: 'dark', label: t('modeDark') }, { value: 'system', label: t('modeSystem') }]} />
        <div className="flex flex-wrap gap-3">
          <Button tone="quiet" onPress={() => void download()}>{t('exportProfile')}</Button>
          <label className="inline-flex min-h-12 cursor-pointer items-center rounded-control bg-card px-5 font-bold ring-2 ring-ink/15">
            {t('importProfile')}
            <input type="file" accept="application/json,.json" className="sr-only" aria-label={t('importProfile')}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void importPlayer(f); e.target.value = ''; }} />
          </label>
          <Button tone="danger" onPress={() => setConfirm(true)}>{t('removePlayer')}</Button>
        </div>
        <p className="text-sm text-ink-soft">{t('pieceArt')}</p>
      </main>
      <ModalOverlay isOpen={confirm} onOpenChange={setConfirm} isDismissable className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
        <Modal className="w-full max-w-sm rounded-card bg-card p-5 shadow-card">
          <Dialog role="alertdialog" className="flex flex-col gap-4 outline-none">
            <Heading slot="title" className="text-xl font-black">{t('removePlayer')}</Heading>
            <p>{t('removeConfirm', { name: player.name ?? '?' })}</p>
            <div className="flex gap-3">
              <Button tone="danger" onPress={async () => { setConfirm(false); await remove(player.id); navigate('/'); }}>{t('removePlayer')}</Button>
              <Button tone="quiet" onPress={() => setConfirm(false)}>{t('cancel')}</Button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}
