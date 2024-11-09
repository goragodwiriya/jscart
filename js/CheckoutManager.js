/**
 * @class CheckoutManager
 * @description ระบบจัดการกระบวนการสั่งซื้อและชำระเงิน
 * รับผิดชอบการจัดการขั้นตอนการสั่งซื้อตั้งแต่ตรวจสอบตะกร้า จนถึงการชำระเงิน
 */
const CheckoutManager = {
  /**
   * @method init
   * @description เริ่มต้นระบบ
   * - ลงทะเบียนเทมเพลต
   * - ตั้งค่าตัวรับฟังเหตุการณ์
   */
  init() {
    this.setupTemplates();
    this.setupEventListeners();
  },

  /**
   * @method setupTemplates
   * @description ลงทะเบียนเทมเพลตทั้งหมดที่จำเป็นสำหรับกระบวนการสั่งซื้อ
   */
  setupTemplates() {
    // เทมเพลตแสดงรายละเอียดการสั่งซื้อ
    TemplateManager.registerTemplate('checkout-details-template',
      `<div class="order-notification">
        <h2>🛍️ คำสั่งซื้อใหม่ #<span data-text="orderId"></span></h2>

        <div class="notification-section">
          <h3>📋 ข้อมูลลูกค้า</h3>
          <div class="customer-info">
            <p><strong>ชื่อผู้รับ:</strong> <span data-text="name"></span></p>
            <p><strong>เบอร์โทร:</strong> <span data-text="phone"></span></p>
            <p><strong>ที่อยู่:</strong> <span data-text="address"></span></p>
            <p data-if="deliveryNotes">
              <strong>หมายเหตุ:</strong> <span data-text="deliveryNotes"></span>
            </p>
          </div>
        </div>

        <div class="notification-section">
          <h3>📦 รายการสินค้า</h3>
          <div class="order-items" data-container="itemsList">
          </div>
        </div>

        <div class="notification-section">
          <h3>💰 สรุปยอดเงิน</h3>
          <div class="order-summary">
            <div class="summary-row">
              <span>ราคารวม:</span>
              <span>฿<span data-text="subtotal"></span></span>
            </div>
            <div class="summary-row">
              <span>ค่าจัดส่ง:</span>
              <span>฿<span data-text="deliveryFee"></span></span>
            </div>
            <div class="summary-row total">
              <strong>ราคาสุทธิ:</strong>
              <strong>฿<span data-text="total"></span></strong>
            </div>
          </div>
        </div>

        <div class="notification-footer">
          <p><strong>วันที่สั่งซื้อ:</strong> <span data-text="orderDate"></span></p>
          <p><strong>สถานะ:</strong> <span class="status-pending">รอชำระเงิน</span></p>
        </div>
      </div>`
    );

    // เทมเพลตสำหรับแต่ละรายการสินค้า
    TemplateManager.registerTemplate('checkout-item-template',
      `<div class="order-item">
        <span class="item-name" data-text="name"></span>
        <span class="item-quantity">x <span data-text="quantity"></span></span>
        <span class="item-price">฿<span data-text="totalPrice"></span></span>
      </div>`
    );

    // เทมเพลตสำหรับหน้ายืนยันการสั่งซื้อ
    TemplateManager.registerTemplate('checkout-confirmation-template',
      `<div id="orderConfirmationModal" class="modal">
        <div class="modal-content glass">
          <div class="modal-header">
            <h2>ยืนยันการสั่งซื้อ</h2>
            <button class="modal-close" aria-label="ปิด">&times;</button>
          </div>
          <div class="modal-body">
            <div data-container="orderDetails">
              <!-- เนื้อหาจาก checkout-details-template จะถูกใส่ที่นี่ -->
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="editCustomerInfo">แก้ไขข้อมูล</button>
            <button type="button" class="btn btn-primary" id="confirmOrder">ยืนยันการสั่งซื้อ</button>
          </div>
        </div>
      </div>`
    );
  },

  /**
   * @method setupEventListeners
   * @description ตั้งค่าตัวรับฟังเหตุการณ์ต่างๆ ที่เกี่ยวข้องกับการสั่งซื้อ
   */
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'editCustomerInfo') {
        this.handleEditCustomerInfo();
      } else if (e.target.id === 'confirmOrder') {
        this.handleConfirmOrder();
      }
    });

    // รับฟังผลการชำระเงิน
    EventBus.on('payment:completed', this.handlePaymentCompleted.bind(this));
  },

  /**
   * @method startCheckout
   * @description เริ่มกระบวนการสั่งซื้อ
   * - ตรวจสอบสินค้าในตะกร้า
   * - แสดงฟอร์มข้อมูลลูกค้า
   * - แสดงหน้ายืนยันการสั่งซื้อ
   */
  async startCheckout() {
    try {
      const cartItems = CartManager.getCartItems();
      if (cartItems.length === 0) {
        NotificationManager.warning('ไม่มีสินค้าในตะกร้า');
        return;
      }

      CustomerManager.showEditForm((savedInfo) => {
        this.showOrderConfirmation();
      });
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการสั่งซื้อ:', error);
      NotificationManager.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  },

  /**
   * @method showOrderConfirmation
   * @description แสดงหน้าต่างยืนยันการสั่งซื้อพร้อมรายละเอียดการสั่งซื้อปัจจุบัน
   */
  showOrderConfirmation() {
    const orderDetails = this.createOrderDetails();
    const orderDetailsHtml = this.createOrderDetailsHtml(orderDetails);

    TemplateManager.showModal('checkout-confirmation-template', {
      orderDetails: orderDetailsHtml
    });
  },

  /**
   * @method handleEditCustomerInfo
   * @description จัดการเมื่อต้องการแก้ไขข้อมูลลูกค้า
   */
  handleEditCustomerInfo() {
    document.getElementById('orderConfirmationModal')?.remove();
    CustomerManager.showEditForm(() => {
      this.showOrderConfirmation();
    });
  },

  /**
   * @method handleConfirmOrder
   * @description จัดการเมื่อกดยืนยันการสั่งซื้อ
   */
  async handleConfirmOrder() {
    try {
      // สร้าง Order
      const orderDetails = this.createOrderDetails();

      // บันทึก Order
      const savedOrder = await OrderManager.createOrder(orderDetails);

      // ล้างตะกร้า
      CartManager.clearCart();

      // ปิดหน้ายืนยันการสั่งซื้อ
      document.getElementById('orderConfirmationModal')?.remove();

      // แสดงหน้าชำระเงิน
      PaymentManager.showPaymentModal(savedOrder);

    } catch (error) {
      console.error('Order confirmation error:', error);
      NotificationManager.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  },

  /**
   * @method createOrderDetailsHtml
   * @description สร้าง HTML สำหรับแสดงรายละเอียดการสั่งซื้อ
   * @param {Object} order - ข้อมูลการสั่งซื้อ
   * @returns {DocumentFragment} HTML สำหรับแสดงรายละเอียดการสั่งซื้อ
   */
  createOrderDetailsHtml(order) {
    const templateData = {
      ...order,
      orderDate: new Date(order.orderDate).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'medium'
      }),
      name: order.customer.name,
      phone: order.customer.phone,
      address: this.formatAddress(order.customer),
      deliveryNotes: order.customer.deliveryNotes,
      subtotal: Utils.formatCurrency(order.total.subtotal),
      deliveryFee: Utils.formatCurrency(order.total.deliveryFee),
      total: Utils.formatCurrency(order.total.total)
    };
    const itemsList = order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      totalPrice: Utils.formatCurrency(item.price * item.quantity)
    }));
    const itemsHtml = itemsList.map(item =>
      TemplateManager.create('checkout-item-template', item)
    );

    return TemplateManager.create('checkout-details-template', {
      ...templateData,
      itemsList: itemsHtml
    });
  },

  /**
   * @method createOrderDetails
   * @description สร้างออบเจ็กต์ข้อมูลการสั่งซื้อจากข้อมูลตะกร้าและข้อมูลลูกค้าปัจจุบัน
   * @returns {Object} ข้อมูลการสั่งซื้อที่สมบูรณ์
   */
  createOrderDetails() {
    const customerInfo = CustomerManager.getCustomerInfo();
    const cartItems = CartManager.getCartItems();
    const cartTotal = CartManager.getCartTotal();

    return {
      orderId: `ORDER${Date.now()}`,
      orderDate: new Date().toISOString(),
      customer: customerInfo,
      items: cartItems,
      total: cartTotal,
      status: CONFIG.ORDER_STATUS.PENDING
    };
  },

  /**
   * @method handlePaymentCompleted
   * @description จัดการเมื่อชำระเงินเสร็จสิ้น
   * - อัพเดทสถานะออเดอร์
   * - แจ้งเตือนแอดมิน
   * - ส่งอีเวนต์แจ้งการสั่งซื้อสำเร็จ
   * @param {Object} paymentResult - ผลลัพธ์การชำระเงิน
   */
  async handlePaymentCompleted({orderId, paymentResult}) {
    try {
      if (!paymentResult.success) {
        NotificationManager.error('การชำระเงินไม่สำเร็จ');
        return;
      }

      const updatedOrder = await OrderManager.updateOrder(orderId, {
        status: CONFIG.ORDER_STATUS.COMPLETED,
        payment: paymentResult,
        completedAt: paymentResult.completedAt
      });

      const notificationHtml = this.createOrderDetailsHtml(updatedOrder);
      await AdminNotifier.notify(notificationHtml);

      EventBus.emit('order:completed', updatedOrder);

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการจัดการการชำระเงิน:', error);
      NotificationManager.error('เกิดข้อผิดพลาดในการดำเนินการ');
    }
  },

  /**
   * @method formatAddress
   * @description จัดรูปแบบที่อยู่ให้เป็นข้อความบรรทัดเดียว
   * @param {Object} customer - ข้อมูลลูกค้า
   * @returns {string} ที่อยู่ที่จัดรูปแบบแล้ว
   */
  formatAddress(customer) {
    return [
      customer.addressLine1,
      customer.addressLine2,
      customer.district,
      customer.province,
      customer.postalCode
    ].filter(Boolean).join(' ');
  }
};
