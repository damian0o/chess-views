import { useState } from 'react';
import { Dialog, DialogTrigger, Heading, Label, Modal, ModalOverlay, TextArea, TextField } from 'react-aria-components';
import { useApp } from '../appStore';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import type { MessageKey } from '@core/i18n/index';

/**
 * "Wczytaj": paste a FEN, a PGN or a lichess link; the error stays in the dialog, the position stays as it was.
 * The overlay is as tall as the visible viewport and keeps the dialog at the top on phones: iOS opens the
 * keyboard over the page without shrinking it, so a bottom-pinned dialog would hide behind the keyboard.
 */
export function LoadDialog() {
  const t = useT();
  const load = useApp((s) => s.loadBoardText);
  const [text, setText] = useState('');
  const [error, setError] = useState<MessageKey | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <DialogTrigger onOpenChange={(open) => { if (open) { setError(null); } }}>
      <Button tone="secondary">{t('load')}</Button>
      <ModalOverlay isDismissable className="fixed top-0 left-0 z-50 flex h-(--visual-viewport-height) w-full items-start justify-center bg-ink/30 p-4 sm:items-center">
        <Modal className="max-h-full w-full max-w-lg overflow-y-auto rounded-card bg-card p-5 shadow-card">
          <Dialog className="flex flex-col gap-3 outline-none">
            {({ close }) => (
              <>
                <Heading slot="title" className="text-xl font-black">{t('load')}</Heading>
                <TextField value={text} onChange={setText} className="flex flex-col gap-1">
                  <Label className="font-bold">{t('loadPrompt')}</Label>
                  <TextArea rows={5} className="rounded-control bg-surface p-3 font-mono text-sm ring-2 ring-ink/15" />
                </TextField>
                {error && <p role="alert" className="font-bold text-bad">{t(error)}</p>}
                <div className="flex gap-3">
                  <Button isDisabled={busy || !text.trim()} onPress={async () => {
                    setBusy(true);
                    const e = await load(text);
                    setBusy(false);
                    if (e) setError(e); else { setText(''); close(); }
                  }}>{busy ? t('loadLichessGame') : t('load')}</Button>
                  <Button tone="quiet" onPress={close}>{t('close')}</Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
