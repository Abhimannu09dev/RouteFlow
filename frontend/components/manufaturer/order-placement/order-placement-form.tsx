"use client";

// import {
//   Form,
//   Input,
//   Button,
//   Card,
//   Space,
//   InputNumber,
//   Select,
//   DatePicker,
//   Row,
//   Col,
//   Divider,
//   Steps,
//   message,
//   Table,
//   Empty,
// } from "antd";
// import {
//   ShoppingCart,
//   MapPin,
//   Package,
//   Truck,
//   DollarSign,
//   Plus,
//   Trash2,
//   ArrowRight,
// } from "lucide-react";
// import { useState } from "react";
// import dayjs from "dayjs";

// interface OrderItem {
//   id: string;
//   productName: string;
//   quantity: number;
//   unitPrice: number;
//   total: number;
//   hsn: string;
// }

// interface FormData {
//   orderType: string;
//   pickupLocation: string;
//   destination: string;
//   productCategory: string;
//   deliveryDate: any;
//   specialInstructions: string;
// }

// const OrderPlacementForm = () => {
//   const [form] = Form.useForm();
//   const [currentStep, setCurrentStep] = useState(0);
//   const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
//   const [isAddingItem, setIsAddingItem] = useState(false);
//   const [itemForm] = Form.useForm();

//   const indianCities = [
//     { label: "Mumbai, Maharashtra", value: "mumbai" },
//     { label: "Delhi, National Capital Region", value: "delhi" },
//     { label: "Bangalore, Karnataka", value: "bangalore" },
//     { label: "Hyderabad, Telangana", value: "hyderabad" },
//     { label: "Chennai, Tamil Nadu", value: "chennai" },
//     { label: "Pune, Maharashtra", value: "pune" },
//     { label: "Kolkata, West Bengal", value: "kolkata" },
//     { label: "Ahmedabad, Gujarat", value: "ahmedabad" },
//     { label: "Jaipur, Rajasthan", value: "jaipur" },
//     { label: "Chandigarh, Union Territory", value: "chandigarh" },
//   ];

//   const productCategories = [
//     { label: "Electronics", value: "electronics" },
//     { label: "Machinery Parts", value: "machinery" },
//     { label: "Raw Materials", value: "raw_materials" },
//     { label: "Finished Goods", value: "finished_goods" },
//     { label: "Packaging Materials", value: "packaging" },
//     { label: "Chemicals", value: "chemicals" },
//     { label: "Textiles", value: "textiles" },
//     { label: "Other", value: "other" },
//   ];

//   const orderTypes = [
//     { label: "Full Truck Load (FTL)", value: "ftl" },
//     { label: "Less Than Truck Load (LTL)", value: "ltl" },
//     { label: "Parcel", value: "parcel" },
//   ];

//   const addOrderItem = (values: any) => {
//     const newItem: OrderItem = {
//       id: String(Date.now()),
//       productName: values.productName,
//       quantity: values.quantity,
//       unitPrice: values.unitPrice,
//       total: values.quantity * values.unitPrice,
//       hsn: values.hsn,
//     };

//     setOrderItems([...orderItems, newItem]);
//     itemForm.resetFields();
//     setIsAddingItem(false);
//     message.success("Item added successfully");
//   };

//   const removeOrderItem = (id: string) => {
//     setOrderItems(orderItems.filter((item) => item.id !== id));
//   };

//   const calculateTotalAmount = () => {
//     return orderItems.reduce((sum, item) => sum + item.total, 0);
//   };

//   const itemColumns = [
//     {
//       title: "Product Name",
//       dataIndex: "productName",
//       key: "productName",
//       render: (text: string) => <span className="font-medium">{text}</span>,
//     },
//     {
//       title: "HSN Code",
//       dataIndex: "hsn",
//       key: "hsn",
//     },
//     {
//       title: "Quantity",
//       dataIndex: "quantity",
//       key: "quantity",
//       align: "center" as const,
//     },
//     {
//       title: "Unit Price (₹)",
//       dataIndex: "unitPrice",
//       key: "unitPrice",
//       align: "right" as const,
//       render: (price: number) => `₹${price.toFixed(2)}`,
//     },
//     {
//       title: "Total (₹)",
//       dataIndex: "total",
//       key: "total",
//       align: "right" as const,
//       render: (total: number) => (
//         <span className="font-semibold text-primary">₹{total.toFixed(2)}</span>
//       ),
//     },
//     {
//       title: "Action",
//       key: "action",
//       align: "center" as const,
//       render: (_: any, record: OrderItem) => (
//         <Button
//           type="text"
//           danger
//           size="small"
//           icon={<Trash2 size={16} />}
//           onClick={() => removeOrderItem(record.id)}
//         />
//       ),
//     },
//   ];

//   const handleNextStep = async () => {
//     if (currentStep === 0) {
//       try {
//         await form.validateFields();
//         setCurrentStep(1);
//       } catch (error) {
//         message.error("Please fill all required fields");
//       }
//     } else if (currentStep === 1) {
//       if (orderItems.length === 0) {
//         message.error("Please add at least one item");
//         return;
//       }
//       setCurrentStep(2);
//     }
//   };

//   const handlePreviousStep = () => {
//     setCurrentStep(currentStep - 1);
//   };

//   const handleSubmit = async () => {
//     try {
//       const formData = await form.validateFields();
//       const submitData = {
//         ...formData,
//         items: orderItems,
//         totalAmount: calculateTotalAmount(),
//       };
//       console.log("Order Data:", submitData);
//       message.success("Order placed successfully!");
//       // Reset form
//       form.resetFields();
//       setOrderItems([]);
//       setCurrentStep(0);
//     } catch (error) {
//       message.error("Please complete all required fields");
//     }
//   };

//   return (
//     <div className="w-full bg-gray-50 min-h-screen p-6 lg:p-8">
//       {/* Header */}
//       <div className="mb-8">
//         <h1 className="text-3xl font-bold text-gray-900 mb-2">
//           Place New Order
//         </h1>
//         <p className="text-gray-600">
//           Complete the form below to place a new shipment order
//         </p>
//       </div>

//       {/* Steps */}
//       <Card className="mb-8 shadow-md border-0">
//         <Steps
//           current={currentStep}
//           items={[
//             {
//               title: "Order Details",
//               description: "Select location and type",
//             },
//             {
//               title: "Add Items",
//               description: "Add products to order",
//             },
//             {
//               title: "Confirm & Submit",
//               description: "Review and submit order",
//             },
//           ]}
//         />
//       </Card>

//       {/* Step 1: Order Details */}
//       {currentStep === 0 && (
//         <Card className="shadow-md border-0 max-w-4xl mx-auto">
//           <Form form={form} layout="vertical" className="space-y-6">
//             <div>
//               <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
//                 <ShoppingCart size={24} className="text-primary" />
//                 Order Type & Location
//               </h2>
//               <Divider />
//             </div>

//             <Row gutter={16}>
//               <Col xs={24} sm={12}>
//                 <Form.Item
//                   label="Order Type"
//                   name="orderType"
//                   rules={[
//                     { required: true, message: "Please select order type" },
//                   ]}
//                 >
//                   <Select
//                     placeholder="Select order type"
//                     options={orderTypes}
//                     size="large"
//                   />
//                 </Form.Item>
//               </Col>
//               <Col xs={24} sm={12}>
//                 <Form.Item
//                   label="Product Category"
//                   name="productCategory"
//                   rules={[
//                     { required: true, message: "Please select category" },
//                   ]}
//                 >
//                   <Select
//                     placeholder="Select product category"
//                     options={productCategories}
//                     size="large"
//                   />
//                 </Form.Item>
//               </Col>
//             </Row>

//             <Row gutter={16}>
//               <Col xs={24} sm={12}>
//                 <Form.Item
//                   label="Pickup Location"
//                   name="pickupLocation"
//                   rules={[
//                     {
//                       required: true,
//                       message: "Please select pickup location",
//                     },
//                   ]}
//                 >
//                   <Select
//                     placeholder="Select pickup location"
//                     options={indianCities}
//                     size="large"
//                     showSearch
//                     filterOption={(input, option) =>
//                       (option?.label ?? "")
//                         .toLowerCase()
//                         .includes(input.toLowerCase())
//                     }
//                   />
//                 </Form.Item>
//               </Col>
//               <Col xs={24} sm={12}>
//                 <Form.Item
//                   label="Destination"
//                   name="destination"
//                   rules={[
//                     { required: true, message: "Please select destination" },
//                   ]}
//                 >
//                   <Select
//                     placeholder="Select destination city"
//                     options={indianCities}
//                     size="large"
//                     showSearch
//                     filterOption={(input, option) =>
//                       (option?.label ?? "")
//                         .toLowerCase()
//                         .includes(input.toLowerCase())
//                     }
//                   />
//                 </Form.Item>
//               </Col>
//             </Row>

//             <Row gutter={16}>
//               <Col xs={24} sm={12}>
//                 <Form.Item
//                   label="Expected Delivery Date"
//                   name="deliveryDate"
//                   rules={[
//                     {
//                       required: true,
//                       message: "Please select delivery date",
//                     },
//                   ]}
//                 >
//                   <DatePicker
//                     size="large"
//                     className="w-full"
//                     disabledDate={(current) =>
//                       current && current < dayjs().startOf("day")
//                     }
//                     placeholder="Select expected delivery date"
//                   />
//                 </Form.Item>
//               </Col>
//               <Col xs={24} sm={12}>
//                 <Form.Item
//                   label="Special Instructions (Optional)"
//                   name="specialInstructions"
//                 >
//                   <Input.TextArea
//                     placeholder="Any special handling instructions?"
//                     rows={3}
//                   />
//                 </Form.Item>
//               </Col>
//             </Row>

//             <Divider />

//             <div className="flex justify-end">
//               <Button
//                 type="primary"
//                 size="large"
//                 icon={<ArrowRight size={18} />}
//                 onClick={handleNextStep}
//                 className="bg-primary"
//               >
//                 Next: Add Items
//               </Button>
//             </div>
//           </Form>
//         </Card>
//       )}

//       {/* Step 2: Add Items */}
//       {currentStep === 1 && (
//         <div className="max-w-6xl mx-auto space-y-6">
//           {/* Add Item Form */}
//           <Card className="shadow-md border-0">
//             <div>
//               <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
//                 <Package size={24} className="text-primary" />
//                 {isAddingItem ? "Add New Item" : "Order Items"}
//               </h2>
//               <Divider />
//             </div>

//             {!isAddingItem && orderItems.length > 0 && (
//               <div className="mb-6">
//                 <h3 className="font-semibold mb-3">Items in Order:</h3>
//                 <Table
//                   columns={itemColumns}
//                   dataSource={orderItems.map((item) => ({
//                     ...item,
//                     key: item.id,
//                   }))}
//                   pagination={false}
//                   className="custom-table"
//                   rowClassName={(_, index) =>
//                     index % 2 === 0 ? "bg-white" : "bg-gray-50"
//                   }
//                 />

//                 <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
//                   <div className="flex justify-between items-center">
//                     <span className="text-lg font-semibold text-gray-900">
//                       Order Total:
//                     </span>
//                     <span className="text-2xl font-bold text-primary">
//                       ₹{calculateTotalAmount().toFixed(2)}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {isAddingItem ? (
//               <Form
//                 form={itemForm}
//                 layout="vertical"
//                 onFinish={addOrderItem}
//                 className="space-y-4"
//               >
//                 <Row gutter={16}>
//                   <Col xs={24} sm={12}>
//                     <Form.Item
//                       label="Product Name"
//                       name="productName"
//                       rules={[
//                         { required: true, message: "Product name required" },
//                       ]}
//                     >
//                       <Input size="large" placeholder="Enter product name" />
//                     </Form.Item>
//                   </Col>
//                   <Col xs={24} sm={12}>
//                     <Form.Item
//                       label="HSN Code"
//                       name="hsn"
//                       rules={[{ required: true, message: "HSN code required" }]}
//                     >
//                       <Input size="large" placeholder="Enter HSN code" />
//                     </Form.Item>
//                   </Col>
//                 </Row>

//                 <Row gutter={16}>
//                   <Col xs={24} sm={8}>
//                     <Form.Item
//                       label="Quantity"
//                       name="quantity"
//                       rules={[{ required: true, message: "Quantity required" }]}
//                     >
//                       <InputNumber
//                         size="large"
//                         className="w-full"
//                         placeholder="Qty"
//                         min={1}
//                       />
//                     </Form.Item>
//                   </Col>
//                   <Col xs={24} sm={8}>
//                     <Form.Item
//                       label="Unit Price (₹)"
//                       name="unitPrice"
//                       rules={[
//                         { required: true, message: "Unit price required" },
//                       ]}
//                     >
//                       <InputNumber
//                         size="large"
//                         className="w-full"
//                         placeholder="Price"
//                         min={0}
//                         precision={2}
//                       />
//                     </Form.Item>
//                   </Col>
//                   <Col xs={24} sm={8} className="flex items-end">
//                     <Form.Item label=" " className="w-full">
//                       <Button
//                         type="primary"
//                         size="large"
//                         block
//                         className="bg-primary"
//                       >
//                         Calculate Total
//                       </Button>
//                     </Form.Item>
//                   </Col>
//                 </Row>

//                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                   <p className="text-sm text-blue-700">
//                     <strong>Total for this item:</strong> ₹
//                     {(
//                       (itemForm.getFieldValue("quantity") || 0) *
//                       (itemForm.getFieldValue("unitPrice") || 0)
//                     ).toFixed(2)}
//                   </p>
//                 </div>

//                 <Space className="w-full justify-end pt-4">
//                   <Button
//                     onClick={() => {
//                       setIsAddingItem(false);
//                       itemForm.resetFields();
//                     }}
//                     size="large"
//                   >
//                     Cancel
//                   </Button>
//                   <Button
//                     type="primary"
//                     htmlType="submit"
//                     size="large"
//                     className="bg-primary"
//                   >
//                     Add Item
//                   </Button>
//                 </Space>
//               </Form>
//             ) : (
//               <Button
//                 type="primary"
//                 icon={<Plus size={18} />}
//                 size="large"
//                 className="bg-primary"
//                 onClick={() => setIsAddingItem(true)}
//               >
//                 Add Item
//               </Button>
//             )}
//           </Card>

//           {/* Navigation Buttons */}
//           <Card className="shadow-md border-0">
//             <div className="flex justify-between">
//               <Button size="large" onClick={handlePreviousStep}>
//                 Previous
//               </Button>
//               <Button
//                 type="primary"
//                 size="large"
//                 onClick={handleNextStep}
//                 className="bg-primary"
//                 icon={<ArrowRight size={18} />}
//               >
//                 Review Order
//               </Button>
//             </div>
//           </Card>
//         </div>
//       )}

//       {/* Step 3: Review & Confirm */}
//       {currentStep === 2 && (
//         <div className="max-w-4xl mx-auto space-y-6">
//           {/* Order Summary */}
//           <Card className="shadow-md border-0">
//             <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
//               <Truck size={24} className="text-primary" />
//               Order Summary
//             </h2>
//             <Divider />

//             <Row gutter={[16, 16]}>
//               <Col xs={24} sm={12}>
//                 <div>
//                   <p className="text-gray-600 text-sm">Order Type</p>
//                   <p className="text-lg font-semibold">
//                     {form.getFieldValue("orderType")?.toUpperCase() ||
//                       "Not specified"}
//                   </p>
//                 </div>
//               </Col>
//               <Col xs={24} sm={12}>
//                 <div>
//                   <p className="text-gray-600 text-sm">Product Category</p>
//                   <p className="text-lg font-semibold">
//                     {form.getFieldValue("productCategory")?.toUpperCase() ||
//                       "Not specified"}
//                   </p>
//                 </div>
//               </Col>

//               <Col xs={24} sm={12}>
//                 <div>
//                   <p className="text-gray-600 text-sm flex items-center gap-1">
//                     <MapPin size={16} />
//                     Pickup Location
//                   </p>
//                   <p className="text-lg font-semibold">
//                     {form.getFieldValue("pickupLocation") || "Not specified"}
//                   </p>
//                 </div>
//               </Col>
//               <Col xs={24} sm={12}>
//                 <div>
//                   <p className="text-gray-600 text-sm flex items-center gap-1">
//                     <MapPin size={16} />
//                     Destination
//                   </p>
//                   <p className="text-lg font-semibold">
//                     {form.getFieldValue("destination") || "Not specified"}
//                   </p>
//                 </div>
//               </Col>

//               <Col xs={24} sm={12}>
//                 <div>
//                   <p className="text-gray-600 text-sm">Delivery Date</p>
//                   <p className="text-lg font-semibold">
//                     {form.getFieldValue("deliveryDate")?.format("DD/MM/YYYY") ||
//                       "Not specified"}
//                   </p>
//                 </div>
//               </Col>
//             </Row>
//           </Card>

//           {/* Items Review */}
//           <Card className="shadow-md border-0">
//             <h3 className="text-lg font-semibold mb-4">Items Review</h3>
//             <Divider />
//             <Table
//               columns={itemColumns}
//               dataSource={orderItems.map((item) => ({
//                 ...item,
//                 key: item.id,
//               }))}
//               pagination={false}
//               className="custom-table"
//               rowClassName={(_, index) =>
//                 index % 2 === 0 ? "bg-white" : "bg-gray-50"
//               }
//             />
//             <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
//               <div className="flex justify-between items-center">
//                 <span className="text-lg font-semibold text-gray-900">
//                   Grand Total:
//                 </span>
//                 <span className="text-3xl font-bold text-primary">
//                   ₹{calculateTotalAmount().toFixed(2)}
//                 </span>
//               </div>
//             </div>
//           </Card>

//           {/* Special Instructions */}
//           {form.getFieldValue("specialInstructions") && (
//             <Card className="shadow-md border-0 bg-blue-50 border-l-4 border-primary">
//               <h3 className="font-semibold mb-2">Special Instructions</h3>
//               <p className="text-gray-700">
//                 {form.getFieldValue("specialInstructions")}
//               </p>
//             </Card>
//           )}

//           {/* Navigation Buttons */}
//           <Card className="shadow-md border-0">
//             <div className="flex justify-between">
//               <Button size="large" onClick={handlePreviousStep}>
//                 Back
//               </Button>
//               <Space>
//                 <Button size="large">Save as Draft</Button>
//                 <Button
//                   type="primary"
//                   size="large"
//                   onClick={handleSubmit}
//                   className="bg-primary"
//                   icon={<ShoppingCart size={18} />}
//                 >
//                   Confirm & Place Order
//                 </Button>
//               </Space>
//             </div>
//           </Card>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OrderPlacementForm;

export default function OrderPlacementForm() {
  return (
    <>
      <section className="w-full h-full p-6 lg:p-8">
        <h1 className="text-2xl font-bold mb-6">Order Placement Form</h1>
        </section>
        </>
  );
};