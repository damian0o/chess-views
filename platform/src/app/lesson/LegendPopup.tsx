import { Dialog, DialogTrigger, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { OPTIONS } from '@core/look';
import type { OptionId } from '@core/types';
import { useT } from '../i18n';
import { Button } from '../ui/Button';

/** "Co widzę?": what each option that is on means, in a popup. The pieces sentence only when nothing else is on. */
export function LegendPopup({ on }: { on: readonly OptionId[] }) {
  const t = useT();
  const others = [...new Set(on)].filter((id) => id !== 'pieces' && OPTIONS[id].legend);
  const lines = (others.length ? others : (['pieces'] as OptionId[])).map((id) => OPTIONS[id].legend!);
  return (
    <DialogTrigger>
      <Button tone="quiet" aria-label={t('legend')}>ⓘ</Button>
      <ModalOverlay isDismissable className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
        <Modal className="w-full max-w-md rounded-card bg-card p-5 shadow-card">
          <Dialog className="flex flex-col gap-3 outline-none">
            {({ close }) => (
              <>
                <Heading slot="title" className="text-xl font-black">{t('legend')}</Heading>
                {lines.map((k) => <p key={k}>{t(k)}</p>)}
                <div><Button onPress={close}>{t('close')}</Button></div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
