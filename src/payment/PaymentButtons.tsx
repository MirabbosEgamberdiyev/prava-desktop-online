import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { paymentApi } from './paymentApi';

export interface PaymentButtonsProps {
  packageId: number;
  packageName: string;
  priceSum: number;
  /** Optional — pass to open in same tab; default = same tab */
  openInNewTab?: boolean;
}

export function PaymentButtons({
  packageId,
  packageName,
  priceSum,
  openInNewTab = false,
}: PaymentButtonsProps) {
  const [loading, setLoading] = useState<'click' | 'payme' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const go = (url: string) => {
    if (openInNewTab) window.open(url, '_blank');
    else window.location.href = url;
  };

  const payClick = async () => {
    setErr(null);
    setLoading('click');
    try {
      const r = await paymentApi.createClickInvoice(packageId);
      go(r.redirectUrl);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Click xatosi');
    } finally {
      setLoading(null);
    }
  };

  const payPayme = async () => {
    setErr(null);
    setLoading('payme');
    try {
      const r = await paymentApi.createPaymeInvoice(packageId);
      go(r.redirectUrl);
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
