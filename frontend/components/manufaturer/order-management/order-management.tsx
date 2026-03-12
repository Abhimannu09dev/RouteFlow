import Link from "next/link";

export default function OrderManagement() {
  return (
    <div className="w-full bg-gray-50 p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
      <p>Manage your orders</p>
      {/* Search order and add order button */}
      <div className="flex items-center justify-between mt-4">
        <input
          type="text"
          placeholder="Search orders..."
          className="w-full md:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Link
          href="/manufacturer/order-management/order-placement-form"
          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add Order
        </Link>
      </div>
    </div>
  );
}
