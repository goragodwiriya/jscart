/**
 * @class OrderManager
 * @description ระบบจัดการข้อมูลการสั่งซื้อและประวัติการสั่งซื้อ
 */
const OrderManager = {
  /**
   * @method init
   * @description เริ่มต้นระบบจัดการการสั่งซื้อ
   */
  init() {
    this.setupTemplates();
    this.setupEventListeners();
  },

  /**
   * @method setupTemplates
   * @description ลงทะเบียนเทมเพลตที่จำเป็นสำหรับแสดงประวัติการสั่งซื้อ
   */
  setupTemplates() {
    // เทมเพลตแสดงประวัติการสั่งซื้อ
    TemplateManager.registerTemplate('order-history-template',
      `<div class="modal">
        <div class="modal-content glass">
          <div class="modal-header">
            <h2>ประวัติการสั่งซื้อ</h2>
            <button class="modal-close" aria-label="ปิด">&times;</button>
          </div>
          <div class="modal-body">
            <div id="orderList" class="order-list" data-container="orders"></div>
          </div>
        </div>
      </div>`
    );

    // เทมเพลตแสดงรายละเอียดการสั่งซื้อ
    TemplateManager.registerTemplate('order-detail-template',
      `<div class="modal">
        <div class="modal-content glass">
          <!-- ส่วนหัว -->
          <div class="modal-header">
            <div class="order-detail-header">
              <h2>คำสั่งซื้อ #<span data-text="orderId"></span></h2>
              <div class="order-status status-pill" data-attr="data-status:status">
                <span data-text="statusText"></span>
              </div>
            </div>
            <button class="modal-close" aria-label="ปิด">&times;</button>
          </div>

          <div class="modal-body">
            <!-- ข้อมูลคำสั่งซื้อ -->
            <div class="order-meta">
              <div class="meta-item">
                <i class="icon-calendar"></i>
                <span data-text="orderDate"></span>
              </div>
            </div>

            <!-- ข้อมูลลูกค้าและการจัดส่ง -->
            <section class="order-section">
              <h3 class="section-title">
                <i class="icon-shipping"></i>
                ข้อมูลการจัดส่ง
              </h3>
              <div class="customer-info card">
                <div class="info-row">
                  <label>ชื่อผู้รับ:</label>
                  <span data-text="name"></span>
                </div>
                <div class="info-row">
                  <label>เบอร์โทร:</label>
                  <span data-text="phone"></span>
                </div>
                <div class="info-row">
                  <label>ที่อยู่:</label>
                  <span data-text="address"></span>
                </div>
                <div class="info-row" data-if="deliveryNotes">
                  <label>หมายเหตุ:</label>
                  <span data-text="deliveryNotes"></span>
                </div>
              </div>
            </section>

            <!-- รายการสินค้า -->
            <section class="order-section">
              <h3 class="section-title">
                <i class="icon-shopping-cart"></i>
                รายการสินค้า
              </h3>
              <div class="order-items card">
                <div data-container="itemsList">
                  <!-- รายการสินค้าจะถูกใส่ที่นี่ -->
                </div>
                <div class="order-summary">
                  <div class="summary-row">
                    <span>ราคารวม</span>
                    <span data-text="subtotal"></span>
                  </div>
                  <div class="summary-row">
                    <span>ค่าจัดส่ง</span>
                    <span data-text="deliveryFee"></span>
                  </div>
                  <div class="summary-row total">
                    <span>ยอดชำระทั้งสิ้น</span>
                    <span data-text="total"></span>
                  </div>
                </div>
              </div>
            </section>

            <!-- ข้อมูลการชำระเงิน -->
            <section class="order-section">
              <h3 class="section-title">
                <i class="icon-payment"></i>
                ข้อมูลการชำระเงิน
              </h3>
              <div class="payment-info card">
                <div class="info-row">
                  <label>วิธีชำระเงิน:</label>
                  <span data-text="paymentMethod"></span>
                </div>
                <div class="info-row">
                  <label>เลขที่ธุรกรรม:</label>
                  <span data-text="transactionId"></span>
                </div>
                <div class="info-row">
                  <label>วันเวลาที่ชำระ:</label>
                  <span data-text="paymentDate"></span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>`
    );

    // รายละเอียดของประวัติการสั่งซื้อ
    TemplateManager.registerTemplate('history-detail-template',
      `<div class="order-card">
        <div class="order-header">
          <div class="order-info">
            <h4>คำสั่งซื้อ #<span data-text="orderId"></span></h4>
            <time data-text="orderDate"></time>
          </div>
          <div class="order-status status-pill" data-attr="data-status:status">
            <span data-text="statusText"></span>
          </div>
        </div>
        <div class="order-footer">
          <span class=order-view data-action="viewOrder" data-attr="data-order-id:orderId">ดูรายละเอียด</span>
          <div class="order-total">
            <span>ยอดรวม</span>
            <strong data-text="total"></strong>
          </div>
        </div>
      </div>`
    );

    // เทมเพลตรายการสั่งซื้อแต่ละรายการ
    TemplateManager.registerTemplate('order-item-template',
      `<div class="order-card">
      <div class="order-header">
        <div class="order-info">
          <h4 class="order-id">คำสั่งซื้อ #<span data-text="orderId"></span></h4>
          <time data-text="orderDate"></time>
        </div>
        <div class="order-status status-pill" data-attr="data-status:status">
          <span data-text="statusText"></span>
        </div>
      </div>

      <div class="order-content">
        <div class="order-items" data-container="itemsList"></div>
        <div class="order-summary">
          <div class="summary-row">
            <span>ราคารวม</span>
            <span data-text="subtotal"></span>
          </div>
          <div class="summary-row">
            <span>ค่าจัดส่ง</span>
            <span data-text="deliveryFee"></span>
          </div>
          <div class="summary-row total">
            <span>ยอดชำระ</span>
            <strong data-text="total"></strong>
          </div>
        </div>
      </div>

      <div class="order-footer">
        <button class="btn btn-secondary" data-action="viewOrder"
          data-attr="data-order-id:orderId">
          ดูรายละเอียด
        </button>
      </div>
    </div>`
    );

    // เทมเพลตรายการสินค้าในรายการสั่งซื้อ
    TemplateManager.registerTemplate('order-item-list-template',
      `<div class="item">
        <div class="item-details">
          <span class="item-name" data-text="name"></span>
          <span class="item-quantity">x<span data-text="quantity"></span></span>
        </div>
        <span class="item-price" data-text="price"></span>
      </div>`
    );

    // เทมเพลตรายการว่างเปล่า
    TemplateManager.registerTemplate('order-empty-template',
      `<div class="empty-state"><i class="icon-package"></i><p>ยังไม่มีประวัติการสั่งซื้อ</p></div>`
    );
  },

  /**
   * @method setupEventListeners
   * @description ตั้งค่าการรับฟังอีเวนต์ต่างๆ
   */
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.matches('[data-action="viewOrder"]')) {
        this.showOrderDetail(target.dataset.orderId);
      }
    });

    // รับฟังอีเวนต์เมื่อมีการสั่งซื้อใหม่
    EventBus.on('order:created', (order) => {
      this.addToHistory(order);
    });
  },

  /**
   * @method showOrderDetail
   * @description แสดงรายละเอียดของคำสั่งซื้อแบบละเอียด
   * @param {string} orderId - รหัสคำสั่งซื้อ
   */
  async showOrderDetail(orderId) {
    try {
      // 1. ดึงข้อมูล Order
      const order = await this.getOrderById(orderId);
      if (!order) {
        NotificationManager.error('ไม่พบข้อมูลคำสั่งซื้อ');
        return;
      }
      console.log(order);
      // 2. แปลงข้อมูลและจัดรูปแบบ
      const orderData = {
        ...order,
        orderDate: new Date(order.orderDate).toLocaleString('th-TH', {
          dateStyle: 'medium',
          timeStyle: 'medium'
        }),
        name: order.customer.name,
        phone: order.customer.phone,
        address: CheckoutManager.formatAddress(order.customer),
        deliveryNotes: order.customer.deliveryNotes,
        subtotal: Utils.formatCurrency(order.total.subtotal),
        deliveryFee: Utils.formatCurrency(order.total.deliveryFee),
        total: Utils.formatCurrency(order.total.total),
        paymentMethod: this.getPaymentMethodText(order.payment?.method),
        transactionId: order.payment?.transactionId || '-',
        paymentDate: order.payment?.date ? Utils.formatDate(order.payment.date, 'WITH_TIME') : '-'
      };

      const itemsList = order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        totalPrice: Utils.formatCurrency(item.price * item.quantity)
      }))
      const itemsHtml = itemsList.map(item =>
        TemplateManager.create('checkout-item-template', item)
      );

      // 3. แสดง Modal
      TemplateManager.showModal('order-detail-template', {
        ...orderData,
        itemsList: itemsHtml
      });

    } catch (error) {
      console.error('Error showing order detail:', error);
      NotificationManager.error('เกิดข้อผิดพลาดในการแสดงรายละเอียดคำสั่งซื้อ');
    }
  },

  /**
   * @method getPaymentMethodText
   * @description แปลงรหัสวิธีการชำระเงินเป็นข้อความ
   * @param {string} method - รหัสวิธีการชำระเงิน
   * @returns {string} ข้อความแสดงวิธีการชำระเงิน
   */
  getPaymentMethodText(method) {
    return CONFIG.PAYMENT.METHODS[method]?.name || method;
  },

  /**
   * @method getOrders
   * @description ดึงข้อมูลประวัติการสั่งซื้อทั้งหมด
   * @returns {Promise<Array>} รายการคำสั่งซื้อ
   */
  async getOrders() {
    try {
      // ดึงข้อมูลจาก localStorage และแปลงเป็น Array
      const ordersData = localStorage.getItem(CONFIG.STORAGE_KEYS.ORDERS);
      const orders = ordersData ? JSON.parse(ordersData) : [];

      // ตรวจสอบว่าเป็น Array
      if (!Array.isArray(orders)) {
        return [];
      }

      // เรียงตามวันที่ล่าสุด
      return orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

    } catch (error) {
      console.error('Error getting orders:', error);
      return [];
    }
  },

  /**
   * @method getOrderById
   * @description ดึงข้อมูลคำสั่งซื้อตามรหัส
   * @param {string} orderId - รหัสคำสั่งซื้อ
   * @returns {Promise<Object|null>} ข้อมูลคำสั่งซื้อ
   */
  async getOrderById(orderId) {
    try {
      const orders = await this.getOrders();
      return orders.find(order => order.orderId === orderId);
    } catch (error) {
      console.error('Error getting order:', error);
      return null;
    }
  },

  /**
   * @method addToHistory
   * @description เพิ่มคำสั่งซื้อใหม่ลงในประวัติ
   * @param {Object} order - ข้อมูลคำสั่งซื้อ
   */
  async addToHistory(order) {
    const orders = Utils.getStorageItem(CONFIG.STORAGE_KEYS.ORDERS, []);
    orders.unshift(order);
    Utils.setStorageItem(CONFIG.STORAGE_KEYS.ORDERS, orders);
    EventBus.emit('orders:updated', orders);
  },

  /**
 * @method createOrder
 * @description สร้างคำสั่งซื้อใหม่และบันทึกลงในระบบ
 * @param {Object} orderData - ข้อมูลการสั่งซื้อ
 * @returns {Promise<Object>} ข้อมูลคำสั่งซื้อที่บันทึกแล้ว
 */
  async createOrder(orderData) {
    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!orderData.customer || !orderData.items?.length || !orderData.total) {
        throw new Error('ข้อมูลการสั่งซื้อไม่ครบถ้วน');
      }

      // สร้างข้อมูล Order ใหม่
      const order = {
        ...orderData,
        orderId: this.generateOrderId(),
        createdAt: new Date().toISOString(),
        status: orderData.status || 'pending'
      };

      // บันทึกลงในระบบ
      const orders = await this.getOrders(); // ดึงข้อมูลเดิม
      orders.unshift(order); // เพิ่ม order ใหม่

      // บันทึกลง localStorage
      localStorage.setItem(CONFIG.STORAGE_KEYS.ORDERS, JSON.stringify(orders));

      // แจ้งเตือนการสร้าง Order ใหม่
      EventBus.emit('order:created', order);

      return order;

    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  /**
   * @method updateOrder
   * @description อัพเดทข้อมูลคำสั่งซื้อที่มีอยู่
   * @param {string} orderId - รหัสคำสั่งซื้อ
   * @param {Object} updateData - ข้อมูลที่ต้องการอัพเดท
   * @returns {Promise<Object>} ข้อมูลคำสั่งซื้อที่อัพเดทแล้ว
   */
  async updateOrder(orderId, updateData) {
    try {
      // ดึงข้อมูลทั้งหมด
      const orders = await this.getOrders();

      // หา index ของ order ที่ต้องการอัพเดท
      const orderIndex = orders.findIndex(order => order.orderId === orderId);
      if (orderIndex === -1) {
        throw new Error('ไม่พบคำสั่งซื้อ');
      }

      // อัพเดทข้อมูล
      const updatedOrder = {
        ...orders[orderIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      // บันทึกการเปลี่ยนสถานะ
      if (updateData.status && updateData.status !== orders[orderIndex].status) {
        updatedOrder.statusHistory = {
          ...updatedOrder.statusHistory,
          [updateData.status]: new Date().toISOString()
        };
      }

      // อัพเดทข้อมูลใน array
      orders[orderIndex] = updatedOrder;

      // บันทึกลง localStorage
      localStorage.setItem(CONFIG.STORAGE_KEYS.ORDERS, JSON.stringify(orders));

      // แจ้งเตือนการอัพเดท
      EventBus.emit('order:updated', updatedOrder);

      return updatedOrder;

    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  },

  /**
   * @method generateOrderId
   * @description สร้างรหัสคำสั่งซื้อใหม่
   * @returns {string} รหัสคำสั่งซื้อ
   */
  generateOrderId() {
    const prefix = 'ORD';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  },

  /**
   * @method getOrderStatus
   * @description แปลงรหัสสถานะเป็นข้อความ
   * @param {string} status - รหัสสถานะ
   * @returns {string} ข้อความแสดงสถานะ
   */
  getOrderStatus(status) {
    return CONFIG.ORDER_STATUS_TEXT[status] || status;
  },

  /**
   * @method calculateOrderTotal
   * @description คำนวณยอดรวมของคำสั่งซื้อ
   * @param {Array} items - รายการสินค้า
   * @returns {Object} ยอดรวมต่างๆ
   */
  calculateOrderTotal(items) {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal >= CONFIG.BUSINESS.FREE_DELIVERY_AMOUNT ? 0 : CONFIG.BUSINESS.DELIVERY_FEE;

    return {
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee
    };
  }
};