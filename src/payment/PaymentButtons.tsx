import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentApi } from './paymentApi';
import { openPaymentUrl } from './paymentRedirect';

export interface PaymentButtonsProps {
  packageId: number;
  packageName: string;
  priceSum: number;
  /**
   * @deprecated Ignored on desktop: provider pages always open in the external browser
   * (allow-listed hosts only, see paymentRedirect.ts).
   */
  openInNewTab?: boolean;
}

export function PaymentButtons({ packageId, packageName, priceSum }: PaymentButtonsProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<'click' | 'payme' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  const go = async (url: string) => {
    try {
      await openPaymentUrl(url);
      setOpened(true);
    } catch (e: any) {
      setOpened(false);
      setErr(
        e?.message === 'PAYMENT_URL_NOT_ALLOWED'
          ? t('payment.invalidRedirect', "To'lov havolasi xavfsiz emas — ochilmadi.")
          : t('payment.openBrowserFailed', "Brauzerni ochib bo'lmadi. Qayta urinib ko'ring."),
      );
    }
  };

  const payClick = async () => {
    setErr(null);
    setOpened(false);
    setLoading('click');
    try {
      const r = await paymentApi.createClickInvoice(packageId);
      await go(r.redirectUrl);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Click xatosi');
    } finally {
      setLoading(null);
    }
  };

  const payPayme = async () => {
    setErr(null);
    setOpened(false);
    setLoading('payme');
    try {
      const r = await paymentApi.createPaymeInvoice(packageId);
      await go(r.redirectUrl);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Payme xatosi');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="xs">
        <Title order={4}>{packageName}</Title>
        <Text fw={600} size="lg">
          {priceSum.toLocaleString('uz-UZ')} so'm
        </Text>
        <Group grow mt="sm">
          <Button
            color="blue"
            loading={loading === 'click'}
            disabled={!!loading}
            onClick={payClick}
          >
            Click orqali to'lash
          </Button>
          <Button
            color="teal"
            loading={loading === 'payme'}
            disabled={!!loading}
            onClick={payPayme}
          >
            Payme orqali to'lash
          </Button>
        </Group>
        {opened && (
          <Text c="dimmed" size="sm" mt="xs">
            {t(
              'payment.openedInBrowser',
              "To'lov sahifasi brauzerda ochildi. To'lovdan so'ng ilovaga qayting — paket avtomatik faollashadi.",
            )}
          </Text>
        )}
        {err && (
          <Text c="red" size="sm" mt="xs">
            {err}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export default PaymentButtons;
