/**
 * บริการจัดการข้อมูลสินค้า
 * รับผิดชอบการดึงข้อมูล, ค้นหา, และกรองสินค้า
 */
class ProductService {
  /**
   * สร้างอินสแตนซ์ของบริการจัดการสินค้า
   */
  constructor() {
    /**
     * URL พื้นฐานสำหรับการเรียกข้อมูล
     * @type {string}
     */
    this.baseUrl = 'data';
  }

  /**
   * ดึงข้อมูลสินค้าทั้งหมด
   * @returns {Promise<Object>} ข้อมูลสินค้า, หมวดหมู่, และแท็ก
   * @throws {Error} เมื่อไม่สามารถโหลดข้อมูลได้
   *
   * @example
   * const {products, categories, tags} = await productService.getProducts();
   */
  async getProducts() {
    try {
      const response = await fetch(`${this.baseUrl}/products.json`);
      if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลสินค้าได้');

      const data = await response.json();
      return {
        products: data.products,     // รายการสินค้า
        categories: data.categories, // หมวดหมู่สินค้า
        tags: data.tags             // แท็กสินค้า
      };
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลสินค้าตาม ID
   * @param {string} productId - ID ของสินค้าที่ต้องการ
   * @returns {Promise<Object|undefined>} ข้อมูลสินค้าหรือ undefined ถ้าไม่พบ
   * @throws {Error} เมื่อไม่สามารถโหลดข้อมูลได้
   *
   * @example
   * const product = await productService.getProductById('PROD-001');
   */
  async getProductById(productId) {
    try {
      const {products} = await this.getProducts();
      return products.find(product => product.id === productId);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า:', error);
      throw error;
    }
  }

  /**
   * กรองสินค้าตามหมวดหมู่
   * @param {Array<Object>} products - รายการสินค้าทั้งหมด
   * @param {string} categoryId - ID ของหมวดหมู่ที่ต้องการ
   * @returns {Array<Object>} รายการสินค้าที่กรองแล้ว
   *
   * @example
   * const bakeryProducts = productService.getProductsByCategory(products, 'bakery');
   */
  getProductsByCategory(products, categoryId) {
    if (categoryId === 'all') return products;
    return products.filter(product => product.category === categoryId);
  }

  /**
   * ค้นหาสินค้าตามคำค้น
   * @param {Array<Object>} products - รายการสินค้าทั้งหมด
   * @param {string} query - คำค้นหา
   * @returns {Array<Object>} รายการสินค้าที่ค้นพบ
   *
   * @example
   * const searchResults = productService.searchProducts(products, 'ขนมปัง');
   */
  searchProducts(products, query) {
    const searchTerm = query.toLowerCase().trim();
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * กรองสินค้าตามเงื่อนไขต่างๆ
   * @param {Array<Object>} products - รายการสินค้าทั้งหมด
   * @param {Object} filters - เงื่อนไขการกรอง
   * @param {string} [filters.category] - หมวดหมู่ที่ต้องการกรอง
   * @param {string} [filters.search] - คำค้นหา
   * @param {Array<string>} [filters.tags] - แท็กที่ต้องการกรอง
   * @returns {Array<Object>} รายการสินค้าที่กรองแล้ว
   *
   * @example
   * const filtered = productService.filterProducts(products, {
   *   category: 'bakery',
   *   search: 'ขนมปัง',
   *   tags: ['new', 'recommended']
   * });
   */
  filterProducts(products, {category, search, tags}) {
    let filtered = [...products];

    // กรองตามหมวดหมู่
    if (category && category !== 'all') {
      filtered = this.getProductsByCategory(filtered, category);
    }

    // กรองตามคำค้นหา
    if (search) {
      filtered = this.searchProducts(filtered, search);
    }

    // กรองตามแท็ก
    if (tags && tags.length > 0) {
      filtered = filtered.filter(product =>
        tags.some(tag => product.tags.includes(tag))
      );
    }

    return filtered;
  }
}
