/**
 * ระบบจัดการการชำระเงิน
 * รับผิดชอบการแสดงหน้าชำระเงิน และการประมวลผลการชำระเงิน
 */
const PaymentManager = {
  /**
   * เริ่มต้นระบบชำระเงิน
   * - ลงทะเบียนเทมเพลต
   * - ตั้งค่าตัวรับฟังเหตุการณ์
   */
  init() {
    this.setupTemplates();
    this.setupEventListeners();
  },

  /**
   * ลงทะเบียนเทมเพลตที่ใช้ในระบบชำระเงิน
   */
  setupTemplates() {
    TemplateManager.registerTemplate('payment-modal-template',
      `<div id="paymentModal" class="modal payment-modal">
        <div class="modal-content glass">
          <div class="modal-header">
            <h2 class="icon-payment">เลือกวิธีชำระเงิน</h2>
            <button class="modal-close" aria-label="ปิด">&times;</button>
          </div>

          <div class="modal-body">
            <!-- สรุปยอดชำระ -->
            <div class="payment-summary total">
              <span>ยอดชำระทั้งหมด</span>
              <span data-text="total"></span>
            </div>

            <!-- วิธีการชำระเงิน -->
            <div class="payment-methods"></div>

            <!-- สถานะการชำระเงิน -->
            <div id="paymentStatus" class="payment-status hidden">
              <div class="loading-spinner">
                <div class="spinner"></div>
              </div>
              <p class="status-message"></p>
            </div>
          </div>
        </div>
      </div>`
    );
  },

  /**
   * ตั้งค่าตัวรับฟังเหตุการณ์สำหรับการทำงานต่างๆ
   */
  setupEventListeners() {
    document.addEventListener('click', async (e) => {
      const target = e.target;

      // จัดการการเลือกวิธีชำระเงิน
      if (target.closest('.payment-method')) {
        const method = target.closest('.payment-method').dataset.method;
        await this.handlePaymentMethodSelection(method);
      }

      // จัดการการปิดหน้าต่าง
      if (target.matches('.modal-close')) {
        const modal = target.closest('.modal');
        if (modal) {
          modal.remove();
        }
      }
    });
  },

  /**
   * แสดงหน้าต่างชำระเงิน
   * @param {Object} orderSummary - ข้อมูลสรุปการสั่งซื้อ
   */
  showPaymentModal(orderSummary) {
    // เก็บ orderId ไว้ใช้ตอนส่งผลการชำระเงิน
    this.currentOrderId = orderSummary.orderId;

    // แสดงหน้าต่างชำระเงิน
    const modal = TemplateManager.showModal('payment-modal-template', {
      total: `฿${orderSummary.total.total.toLocaleString()}`
    });
    if (!modal) return;

    // แสดงช่องทางการชำระเงินที่เปิดใช้งาน
    const methodsContainer = modal.querySelector('.payment-methods');
    methodsContainer.innerHTML = Object.entries(CONFIG.PAYMENT.METHODS)
      .filter(([_, method]) => method.enabled)
      .map(([key, method]) => (
        `<button class="payment-method" data-method="${key}">
          <div class="payment-method-icon">
            <i class="${method.icon}"></i>
          </div>
          <div class="payment-method-content">
            <div class="payment-method-title">${method.name}</div>
            <div class="payment-method-desc">
              ${method.description}
            </div>
          </div>
        </button>`
      )).join('');
  },

  /**
   * จัดการการเลือกวิธีชำระเงิน
   * @param {string} method - รหัสวิธีการชำระเงินที่เลือก
   */
  async handlePaymentMethodSelection(method) {
    const modal = document.querySelector('#paymentModal');
    const methodsContainer = modal.querySelector('.payment-methods');
    const statusDiv = modal.querySelector('#paymentStatus');
    const statusMessage = statusDiv.querySelector('.status-message');

    try {
      // ซ่อนตัวเลือกวิธีชำระเงิน
      methodsContainer.style.display = 'none';

      // แสดงสถานะกำลังดำเนินการ
      statusDiv.classList.remove('hidden');
      statusMessage.textContent = 'กำลังดำเนินการชำระเงิน...';

      // ดำเนินการชำระเงิน
      const result = await this.processPayment(method);

      if (!result.success) {
        // กรณีชำระเงินไม่สำเร็จ
        methodsContainer.style.display = 'block';
        statusDiv.classList.add('hidden');
        NotificationManager.error('การชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }

      // แสดงผลสำเร็จ
      statusMessage.textContent = 'การชำระเงินสำเร็จ';
      statusMessage.classList.add('success');

      // ส่งผลการชำระเงิน
      EventBus.emit('payment:completed', {
        orderId: this.currentOrderId,
        paymentResult: {
          ...result,
          completedAt: new Date().toISOString()
        }
      });

      // ปิดหน้าต่างและแสดงข้อความขอบคุณ
      setTimeout(() => {
        modal.remove();
        NotificationManager.success('ขอบคุณสำหรับการสั่งซื้อ!');
      }, 1500);

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการชำระเงิน:', error);
      // กรณีเกิดข้อผิดพลาด
      methodsContainer.style.display = 'block';
      statusMessage.textContent = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง หรือเปลี่ยนช่องทางการชำระเงินอื่น';
      statusMessage.classList.add('error');
    }
  },

  /**
   * จำลองการประมวลผลการชำระเงิน
   * @param {string} method - วิธีการชำระเงินที่เลือก
   * @returns {Promise<Object>} ผลลัพธ์การชำระเงิน
   */
  async processPayment(method) {
    // จำลองการชำระเงินสำเร็จเสมอ
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          transactionId: `TXN${Date.now()}`,
          method,
          date: new Date().toISOString()
        });
      }, 2000);
    });
  }
};