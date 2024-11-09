/**
 * ตัวควบคุมการจัดการสินค้า
 * ทำหน้าที่เชื่อมต่อระหว่าง ProductService และ ProductView
 * จัดการการโหลดข้อมูล การกรอง และการอัพเดทการแสดงผล
 */
class ProductController {
  /**
   * สร้างอินสแตนซ์ของตัวควบคุมสินค้า
   * @param {ProductService} service - บริการจัดการข้อมูลสินค้า
   * @param {ProductView} view - ส่วนแสดงผลสินค้า
   */
  constructor(service, view) {
    /** @private บริการจัดการข้อมูลสินค้า */
    this.service = service;

    /** @private ส่วนแสดงผลสินค้า */
    this.view = view;

    /**
     * @private สถานะของระบบ
     * @property {Array} products - รายการสินค้า
     * @property {Array} categories - รายการหมวดหมู่
     * @property {Object} tags - ข้อมูลแท็ก
     * @property {Object} filters - ตัวกรองที่ใช้งาน
     */
    this.state = {
      products: [],
      categories: [],
      tags: {},
      filters: {
        category: 'all',  // หมวดหมู่ที่เลือก
        search: '',       // คำค้นหา
        tags: []          // แท็กที่เลือก
      }
    };
  }

  /**
   * เริ่มต้นระบบ
   * - โหลดข้อมูลสินค้า
   * - ตั้งค่าการแสดงผล
   * - ผูกอีเวนต์
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // แสดงสถานะกำลังโหลด
      this.view.renderLoadingState();

      // โหลดข้อมูล
      const data = await this.service.getProducts();
      this.state = {
        ...this.state,
        products: data.products,
        categories: data.categories,
        tags: data.tags
      };

      // ตั้งค่าการแสดงผล
      this.view.renderCategories(this.state.categories);
      this.applyFilters();

      // ผูกอีเวนต์
      this.bindEvents();

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเริ่มต้นระบบ:', error);
      this.view.renderError('ไม่สามารถโหลดข้อมูลสินค้าได้');
    }
  }

  /**
   * ผูกอีเวนต์การทำงานต่างๆ
   * - การกรองตามหมวดหมู่
   * - การค้นหา
   * - การเพิ่มลงตะกร้า
   * @private
   */
  bindEvents() {
    // การกรองตามหมวดหมู่
    this.view.bindCategoryFilter((category) => {
      this.state.filters.category = category;
      this.applyFilters();
    });

    // การค้นหา
    this.view.bindSearch((query) => {
      this.state.filters.search = query;
      this.applyFilters();
    });

    // การเพิ่มลงตะกร้า
    this.view.bindAddToCart(async (productId) => {
      try {
        const product = await this.service.getProductById(productId);
        if (product) {
          CartManager.addToCart(product);
        }
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเพิ่มสินค้าลงตะกร้า:', error);
        NotificationManager.showError('ไม่สามารถเพิ่มสินค้าลงตะกร้าได้');
      }
    });
  }

  /**
   * ใช้ตัวกรองกับรายการสินค้าและอัพเดทการแสดงผล
   * @private
   */
  applyFilters() {
    // กรองสินค้าตามเงื่อนไข
    const filtered = this.service.filterProducts(
      this.state.products,
      this.state.filters
    );

    // อัพเดทการแสดงผล
    this.view.renderProducts(filtered, this.state.tags);
  }
}
