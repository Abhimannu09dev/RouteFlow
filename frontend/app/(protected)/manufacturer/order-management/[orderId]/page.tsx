import OrderDetail from "@/components/manufaturer/order-management/order-detail";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  return <OrderDetail orderId={orderId} />;
}
