/**
 * ระบบจัดการประวัติการสั่งซื้อ
 * รับผิดชอบการแสดงผล จัดการ และกรองข้อมูลประวัติการสั่งซื้อ
 */
const OrderHistoryManager = {
  /**
   * เริ่มต้นระบบ
   * - ตั้งค่าเทมเพลต
   * - ตั้งค่าตัวรับฟังเหตุการณ์
   * - กำหนดค่าเริ่มต้นสำหรับตัวกรอง
   */
  init() {
    this.setupTemplates();
    this.setupEventListeners();
    this.currentFilters = {
      status: 'all',           // สถานะการสั่งซื้อ
      dateRange: 'all',        // ช่วงเวลา
      sortBy: 'date',          // เรียงตาม
      sortOrder: 'desc'        // ลำดับการเรียง
    };
  },

  /**
   * ตั้งค่าเทมเพลตทั้งหมดที่ใช้ในระบบ
   */
  setupTemplates() {
    // เทมเพลตหลักสำหรับหน้าประวัติการสั่งซื้อ
    TemplateManager.registerTemplate('order-history-template',
      `<div class="modal">
        <div class="modal-content glass">
          <div class="modal-header">
            <h2>ประวัติการสั่งซื้อ</h2>
            <button class="modal-close" aria-label="ปิด">&times;</button>
          </div>
          <div class="modal-body">
            <div data-container="orders"></div>
            <div data-container="pagination"></div>
          </div>
        </div>
      </div>`
    );

    // เทมเพลตสำหรับรายการคำสั่งซื้อ
    TemplateManager.registerTemplate('order-list-template',
      `<div class="order-list" data-container="orderItems">
        <!-- รายการคำสั่งซื้อจะถูกใส่ที่นี่ -->
      </div>`
    );

    // เทมเพลตสำหรับการแบ่งหน้า
    TemplateManager.registerTemplate('pagination-template',
      `<div class="order-history-pagination">
        <button id="prevPageBtn" class="btn" data-action="prevPage" data-attr="disabled:disablePrev">ก่อนหน้า</button>
        <span class="page-info">
          หน้า <span id="currentPageText" data-text="currentPage"></span>
          จาก <span id="totalPagesText" data-text="totalPages"></span>
        </span>
        <button id="nextPageBtn" class="btn" data-action="nextPage" data-attr="disabled:disableNext">ถัดไป</button>
      </div>`
    );
  },

  /**
   * แสดงหน้าต่างประวัติการสั่งซื้อ
   * - โหลดข้อมูลการสั่งซื้อ
   * - ประมวลผลและจัดรูปแบบข้อมูล
   * - แสดงผลและตั้งค่าการแบ่งหน้า
   */
  async showOrderHistory() {
    this.currentPage = 1;
    this.itemsPerPage = 5;

    const orders = await OrderManager.getOrders();
    const processedOrders = this.processOrders(orders);

    const modal = TemplateManager.showModal('order-history-template', {
      orders: this.createOrderList(processedOrders),
      pagination: this.createPagination(processedOrders.length)
    });

    if (!modal) {
      NotificationManager.error('ไม่สามารถแสดงประวัติการสั่งซื้อได้');
      return;
    }

    this.updatePageDisplay(processedOrders);
  },

  /**
   * สร้างรายการคำสั่งซื้อ
   * @param {Array} orders - รายการคำสั่งซื้อที่ต้องการแสดง
   * @returns {DocumentFragment} HTML สำหรับแสดงรายการ
   */
  createOrderList(orders) {
    if (orders.length === 0) {
      return TemplateManager.create('order-empty-template');
    }

    const orderItems = orders.map(order =>
      TemplateManager.create('history-detail-template', {
        orderId: order.orderId,
        orderDate: Utils.formatDate(order.orderDate, 'LONG'),
        status: order.status,
        statusText: CONFIG.ORDER_STATUS_TEXT[order.status],
        total: Utils.formatCurrency(order.total.total)
      })
    );

    return TemplateManager.create('order-list-template', {
      orderItems
    });
  },

  /**
   * ประมวลผลและกรองข้อมูลคำสั่งซื้อ
   * @param {Array} orders - รายการคำสั่งซื้อทั้งหมด
   * @returns {Array} รายการที่ผ่านการกรองแล้ว
   */
  processOrders(orders) {
    let filtered = [...orders];

    // กรองตามสถานะ
    if (this.currentFilters.status !== 'all') {
      filtered = filtered.filter(order =>
        order.status === this.currentFilters.status
      );
    }

    // กรองตามช่วงเวลา
    if (this.currentFilters.dateRange !== 'all') {
      const now = new Date();
      const days = parseInt(this.currentFilters.dateRange);
      if (!isNaN(days)) {
        const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(order =>
          new Date(order.orderDate) >= cutoff
        );
      } else if (this.currentFilters.dateFrom && this.currentFilters.dateTo) {
        const from = new Date(this.currentFilters.dateFrom);
        const to = new Date(this.currentFilters.dateTo);
        filtered = filtered.filter(order => {
          const date = new Date(order.orderDate);
          return date >= from && date <= to;
        });
      }
    }

    // จัดเรียงข้อมูล
    filtered.sort((a, b) => {
      const order = this.currentFilters.sortOrder === 'asc' ? 1 : -1;

      switch (this.currentFilters.sortBy) {
        case 'date':
          return (new Date(b.orderDate) - new Date(a.orderDate)) * order;
        case 'total':
          return (b.total.total - a.total.total) * order;
        case 'status':
          return a.status.localeCompare(b.status) * order;
        default:
          return 0;
      }
    });

    return filtered;
  },

  /**
   * ตั้งค่าตัวรับฟังเหตุการณ์
   */
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      const action = target.dataset.action;

      switch (action) {
        case 'prevPage':
          if (!target.disabled && this.currentPage > 1) {
            this.currentPage--;
            this.updatePageDisplay();
          }
          break;

        case 'nextPage':
          const totalPages = Math.ceil(this.getTotalItems() / this.itemsPerPage);
          if (!target.disabled && this.currentPage < totalPages) {
            this.currentPage++;
            this.updatePageDisplay();
          }
          break;
      }
    });
  },

  /**
   * นับจำนวนรายการทั้งหมด
   */
  getTotalItems() {
    return document.querySelectorAll('.order-card').length;
  },

  /**
   * อัพเดทการแสดงผลการแบ่งหน้า
   */
  updatePageDisplay() {
    const totalItems = this.getTotalItems();
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);

    // อัพเดทเลขหน้า
    const currentPageText = document.getElementById('currentPageText');
    const totalPagesText = document.getElementById('totalPagesText');
    if (currentPageText) currentPageText.textContent = this.currentPage;
    if (totalPagesText) totalPagesText.textContent = totalPages;

    // อัพเดทสถานะปุ่ม
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;

    // แสดง/ซ่อนรายการตามหน้าปัจจุบัน
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    document.querySelectorAll('.order-card').forEach((card, index) => {
      card.style.display = (index >= start && index < end) ? 'block' : 'none';
    });
  },

  /**
   * สร้างตัวแบ่งหน้า
   * @param {number} totalItems - จำนวนรายการทั้งหมด
   * @returns {DocumentFragment} HTML สำหรับแสดงตัวแบ่งหน้า
   */
  createPagination(totalItems) {
    return TemplateManager.create('pagination-template', {
      currentPage: this.currentPage,
      totalPages: Math.ceil(totalItems / this.itemsPerPage),
      disablePrev: this.currentPage <= 1,
      disableNext: this.currentPage >= Math.ceil(totalItems / this.itemsPerPage)
    });
  }
};