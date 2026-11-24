import { Dialog, DialogTrigger, Heading, Modal, ModalOverlay } from 'react-aria-components';
import type { View } from '../views';
import { useT } from '../i18n';
import { Button } from '../ui/Button';

/** "Co widzę?": what the selected view's colours, rings and marks mean, in a popup. */
export function LegendPopup({ view }: { view: View }) {
  const t = useT();
  return (
    <DialogTrigger>
      <Button tone="quiet" aria-label={t('legend')}>ⓘ</Button>
      <ModalOverlay isDismissable className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
        <Modal className="w-full max-w-md rounded-card bg-card p-5 shadow-card">
          <Dialog className="flex flex-col gap-3 outline-none">
            {({ close }) => (
              <>
                <Heading slot="title" className="text-xl font-black">{t(view.label)}</Heading>
                <p>{t(view.legend)}</p>
                <div><Button onPress={close}>{t('close')}</Button></div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
