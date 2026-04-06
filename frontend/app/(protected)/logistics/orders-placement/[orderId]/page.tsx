import LogisticsOrderDetail from "@/components/logistics/order-management/order-detail";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function LogisticsOrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  return <LogisticsOrderDetail orderId={orderId} />;
}
