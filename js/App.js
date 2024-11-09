/**
 * แอพพลิเคชันคอร์หลัก
 * รับผิดชอบการเริ่มต้นระบบ การโหลดข้อมูล และการจัดการสถานะแอพพลิเคชัน
 */
const App = {
  /**
   * เริ่มต้นแอพพลิเคชัน
   * - แสดงสถานะกำลังโหลด
   * - เริ่มต้นบริการหลัก
   * - เริ่มต้นระบบจัดการต่างๆ
   * - โหลดข้อมูลเริ่มต้น
   * - ตั้งค่าตัวรับฟังเหตุการณ์
   */
  async init() {
    try {
      this.showLoading();
      await this.initializeCore();
      await this.initializeManagers();
      await this.loadInitialData();
      this.setupEventListeners();
      this.hideLoading();
      EventBus.emit('app:ready');
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเริ่มต้นแอพพลิเคชัน:', error);
      this.handleInitError(error);
    }
  },

  /**
   * แสดงสถานะกำลังโหลด
   */
  showLoading() {
    State.isLoading = true;
    document.body.classList.add('app-loading');
  },

  /**
   * ซ่อนสถานะกำลังโหลด
   */
  hideLoading() {
    State.isLoading = false;
    document.body.classList.remove('app-loading');
  },

  /**
   * เริ่มต้นบริการหลักของระบบ
   * - โหลดการตั้งค่าที่บันทึกไว้
   * - เริ่มต้นระบบจัดการเทมเพลต
   * - เริ่มต้นระบบแจ้งเตือน
   * - เริ่มต้นระบบธีม
   */
  async initializeCore() {
    State.settings = await this.loadSettings();

    TemplateManager.init();
    NotificationManager.init({
      duration: CONFIG.NOTIFICATION_DURATION
    });

    ThemeManager.init({
      defaultTheme: State.settings?.theme || 'light'
    });
  },

  /**
   * เริ่มต้นระบบจัดการต่างๆ ของแอพพลิเคชัน
   */
  async initializeManagers() {
    CartManager.init();
    CustomerManager.init();
    CheckoutManager.init();
    OrderManager.init();
    OrderHistoryManager.init();
    PaymentManager.init();
    ProductView.init();
  },

  /**
   * โหลดข้อมูลเริ่มต้นที่จำเป็น
   */
  async loadInitialData() {
    try {
      const data = await this.fetchProducts();

      State.products = data.products;
      State.categories = data.categories;
      State.tags = data.tags;

      this.renderInitialViews();

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', error);
      throw new Error('ไม่สามารถโหลดข้อมูลสินค้าได้');
    }
  },

  /**
   * ดึงข้อมูลสินค้าจากเซิร์ฟเวอร์
   */
  async fetchProducts() {
    try {
      const response = await fetch('data/products.json');
      if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลสินค้าได้');
      return await response.json();
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเชื่อมต่อ:', error);
      throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  },

  /**
   * แสดงข้อมูลเริ่มต้นในหน้าเว็บ
   */
  renderInitialViews() {
    ProductView.renderCategories(State.categories);
    ProductView.renderProducts(State.products);
    CartManager.updateCartDisplay();
    CustomerManager.updateProfileDisplay();
  },

  /**
   * ตั้งค่าตัวรับฟังเหตุการณ์ต่างๆ
   */
  setupEventListeners() {
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      ThemeManager.toggleTheme();
    });

    this.setupGlobalEvents();
  },

  /**
   * ตั้งค่าตัวรับฟังเหตุการณ์ระดับแอพพลิเคชัน
   */
  setupGlobalEvents() {
    EventBus.on('cart:updated', () => {
      this.saveAppState();
    });

    EventBus.on('order:completed', (order) => {
      this.handleOrderCompletion(order);
    });

    EventBus.on('customer:updated', () => {
      this.saveAppState();
    });

    // ตรวจสอบสถานะการเชื่อมต่อ
    window.addEventListener('online', () => {
      NotificationManager.success('เชื่อมต่ออินเทอร์เน็ตแล้ว');
    });

    window.addEventListener('offline', () => {
      NotificationManager.warning('ขาดการเชื่อมต่ออินเทอร์เน็ต');
    });
  },

  /**
   * โหลดการตั้งค่าจาก localStorage
   */
  async loadSettings() {
    try {
      const savedSettings = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
      return savedSettings ? JSON.parse(savedSettings) : null;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดการตั้งค่า:', error);
      return null;
    }
  },

  /**
   * บันทึกสถานะแอพพลิเคชันลง localStorage
   */
  saveAppState() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CART,
      JSON.stringify(State.cart)
    );

    localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS,
      JSON.stringify(State.settings)
    );
  },

  /**
   * จัดการเมื่อการสั่งซื้อเสร็จสมบูรณ์
   */
  handleOrderCompletion(order) {
    CartManager.clearCart();

    NotificationManager.success(
      `ขอบคุณสำหรับการสั่งซื้อ #${order.orderId}`
    );

    EventBus.emit('analytics:order_completed', order);
  },

  /**
   * จัดการข้อผิดพลาดในการเริ่มต้นแอพพลิเคชัน
   */
  handleInitError(error) {
    this.hideLoading();

    const errorMessage = error.message || 'ไม่สามารถเริ่มต้นแอพพลิเคชันได้';
    NotificationManager.error(errorMessage);

    document.body.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="icon-error"></i>
        </div>
        <h1>เกิดข้อผิดพลาด</h1>
        <p>${errorMessage}</p>
        <button onclick="location.reload()" class="btn btn-primary">
          ลองใหม่อีกครั้ง
        </button>
      </div>
    `;
  }
};

// เริ่มต้นแอพพลิเคชันเมื่อ DOM พร้อม
document.addEventListener('DOMContentLoaded', () => App.init());
