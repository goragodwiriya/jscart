/**
 * ระบบแสดงผลสินค้า
 * รับผิดชอบการแสดงผล จัดการ และกรองสินค้าในหน้าร้าน
 */
const ProductView = {
  /**
   * อิลิเมนต์ที่ใช้ในการแสดงผล
   */
  elements: {
    productGrid: null,      // ตารางแสดงสินค้า
    categoryFilters: null,  // ตัวกรองหมวดหมู่
    searchInput: null       // ช่องค้นหา
  },

  /**
   * เริ่มต้นระบบแสดงผลสินค้า
   * @param {Object} config - ค่าตั้งต้นของระบบ
   */
  init(config = {}) {
    // กำหนดอิลิเมนต์ที่ใช้งาน
    this.elements = {
      productGrid: config.productGrid || document.getElementById('productGrid'),
      categoryFilters: config.categoryFilters || document.getElementById('categoryFilters'),
      searchInput: config.searchInput || document.getElementById('searchInput')
    };

    // ตรวจสอบอิลิเมนต์หลัก
    if (!this.elements.productGrid) {
      console.error('ไม่พบอิลิเมนต์สำหรับแสดงสินค้า');
      return;
    }

    this.setupEventListeners();
  },

  /**
   * ตั้งค่าตัวรับฟังเหตุการณ์
   */
  setupEventListeners() {
    // จัดการการค้นหา
    this.elements.searchInput?.addEventListener('input',
      Utils.debounce((e) => {
        const searchTerm = e.target.value.trim();
        this.filterProducts({
          search: searchTerm,
          category: this.currentCategory
        });
      }, 300)
    );

    // จัดการการกรองหมวดหมู่
    this.elements.categoryFilters?.addEventListener('click', (e) => {
      const button = e.target.closest('.category-filter');
      if (!button) return;

      // อัพเดทการแสดงผลปุ่ม
      this.elements.categoryFilters
        .querySelectorAll('.category-filter')
        .forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // กรองสินค้าตามหมวดหมู่
      this.currentCategory = button.dataset.category;
      this.filterProducts({
        category: this.currentCategory,
        search: this.elements.searchInput?.value.trim()
      });
    });

    // จัดการการเพิ่มสินค้าลงตะกร้า
    this.elements.productGrid?.addEventListener('click', (e) => {
      const button = e.target.closest('.add-to-cart-btn');
      if (!button || button.disabled) return;
      this.handleAddToCart(button);
    });
  },

  /**
   * จัดการการเพิ่มสินค้าลงตะกร้า
   * @param {HTMLElement} button - ปุ่มเพิ่มลงตะกร้า
   */
  handleAddToCart(button) {
    const productId = button.dataset.productId;
    const product = State.products.find(p => p.id === productId);
    if (product) {
      CartManager.addToCart(product);
    }
  },

  /**
   * แสดงสถานะกำลังโหลด
   */
  showLoading() {
    this.elements.productGrid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลดสินค้า...</p>
      </div>
    `;
  },

  /**
   * แสดงข้อผิดพลาด
   */
  showError(message) {
    this.elements.productGrid.innerHTML = `
      <div class="error-state">
        <i class="icon-alert-circle"></i>
        <h3>${message}</h3>
        <button onclick="location.reload()" class="btn btn-primary">
          ลองใหม่อีกครั้ง
        </button>
      </div>
    `;
  },

  /**
   * แสดงสถานะไม่มีสินค้า
   */
  showEmpty(message = 'ไม่พบสินค้า') {
    this.elements.productGrid.innerHTML = `
      <div class="empty-state">
        <i class="icon-package"></i>
        <h3>${message}</h3>
      </div>
    `;
  },

  /**
   * แสดงรายการสินค้า
   * @param {Array} products - รายการสินค้าที่ต้องการแสดง
   */
  renderProducts(products) {
    if (!products || products.length === 0) {
      this.showEmpty();
      return;
    }

    this.elements.productGrid.innerHTML = '';

    products.forEach(product => {
      const element = TemplateManager.create('product-card-template', {
        id: product.id,
        name: product.name,
        description: product.description,
        image: product.image,
        formattedPrice: Utils.formatCurrency(product.price),
        hasNutrition: !!product.nutrition,
        nutrition: product.nutrition,
        ingredients: product.ingredients,
        ingredientsList: product.ingredients?.join(', '),
        allergens: product.allergens,
        allergensList: product.allergens?.join(', '),
        available: product.available && product.stock > 0,
        stockClass: this.getStockClass(product),
        stockText: this.getStockText(product),
        buttonClass: this.getButtonClass(product),
        buttonText: this.getButtonText(product),
        tags: this.gettags(product)
      });

      // จัดการปุ่มเพิ่มลงตะกร้า
      const addToCartBtn = element.querySelector('.add-to-cart-btn');
      if (addToCartBtn) {
        addToCartBtn.classList.add(this.getButtonClass(product));
        if (!product.available || product.stock <= 0) {
          addToCartBtn.disabled = true;
        }
      }

      // เพิ่มแท็กสินค้า
      if (product.tags) {
        const tagsContainer = element.querySelector('.product-tags');
        if (tagsContainer) {
          tagsContainer.innerHTML = '';
          product.tags.forEach(tagId => {
            const tagInfo = State.tags[tagId];
            if (tagInfo) {
              const Tag = TemplateManager.create('product-tags-template', {
                name: tagInfo.name,
                icon: `fas ${tagInfo.icon}`,
                style: `background-color: ${tagInfo.color}`
              });
              tagsContainer.appendChild(Tag);
            }
          });
        }
      }

      this.elements.productGrid.appendChild(element);
    });
  },

  /**
   * สร้างคลาสแสดงสถานะสต็อก
   */
  getStockClass(product) {
    if (!product.available) return 'out-of-stock';
    if (product.stock <= 5) return 'low-stock';
    if (product.stock <= 20) return 'medium-stock';
    return 'in-stock';
  },

  /**
   * สร้างข้อความแสดงสถานะสต็อก
   */
  getStockText(product) {
    if (!product.available) return 'สินค้าหมด';
    if (product.stock <= 5) return `เหลือ ${product.stock} ชิ้นสุดท้าย`;
    if (product.stock <= 20) return `เหลือ ${product.stock} ชิ้น`;
    return 'มีสินค้า';
  },

  /**
   * สร้างคลาสสำหรับปุ่มเพิ่มลงตะกร้า
   */
  getButtonClass(product) {
    if (!product.available || product.stock <= 0) return 'btn btn-disabled';
    if (product.stock <= 5) return 'btn btn-warning';
    return 'add-to-cart-btn';
  },

  /**
   * สร้างข้อความสำหรับปุ่มเพิ่มลงตะกร้า
   */
  getButtonText(product) {
    if (!product.available) return 'สินค้าหมด';
    if (product.stock <= 0) return 'สินค้าหมด';
    if (product.stock <= 5) return 'สั่งซื้อด่วน';
    return 'เพิ่มลงตะกร้า';
  },

  /**
   * สร้างแท็กสำหรับสินค้า
   */
  gettags(product) {
    const tags = [];

    if (product.category) {
      const category = State.categories.find(c => c.id === product.category);
      if (category) {
        tags.push({
          name: category.name,
          icon: category.icon,
          style: 'category-Tag'
        });
      }
    }

    if (product.tags) {
      product.tags.forEach(tagId => {
        const tag = State.tags[tagId];
        if (tag) {
          tags.push({
            name: tag.name,
            icon: tag.icon,
            style: `background-color: ${tag.color}`
          });
        }
      });
    }

    return tags;
  },

  /**
   * แสดงรายการหมวดหมู่
   */
  renderCategories(categories) {
    if (!this.elements.categoryFilters) return;

    // เพิ่มหมวดหมู่ "ทั้งหมด"
    const allCategory = TemplateManager.create('category-filter-template', {
      category: 'all',
      name: 'ทั้งหมด',
      icon: 'fas fa-th-large'
    });
    allCategory.querySelector('.category-filter').classList.add('active');
    this.elements.categoryFilters.appendChild(allCategory);

    // เรียงและแสดงหมวดหมู่
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    sortedCategories.forEach(category => {
      const element = TemplateManager.create('category-filter-template', {
        category: category.id,
        name: category.name,
        icon: `fas ${category.icon}`
      });
      this.elements.categoryFilters.appendChild(element);
    });
  },

  /**
   * ตั้งค่าการโหลดรูปภาพแบบ lazy
   */
  setupLazyLoading() {
    const images = this.elements.productGrid.querySelectorAll('img[loading="lazy"]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });
    images.forEach(img => imageObserver.observe(img));
  },

  /**
   * แสดงรายละเอียดสินค้าแบบด่วน
   */
  showQuickView(productId) {
    const product = State.products.find(p => p.id === productId);
    if (!product) return;

    TemplateManager.showModal('product-quick-view-template', {
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.image,
      formattedPrice: Utils.formatCurrency(product.price),
      stock: product.stock,
      hasNutrition: !!product.nutrition,
      ...product.nutrition,
      inStock: product.stock > 0
    });
  },

  /**
   * กรองสินค้าตามเงื่อนไข
   */
  filterProducts(filters = {}) {
    let filtered = [...State.products];

    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(product =>
        product.category === filters.category
      );
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search) ||
        product.description.toLowerCase().includes(search) ||
        product.tags.some(tag =>
          State.tags[tag].name.toLowerCase().includes(search)
        )
      );
    }

    this.renderProducts(filtered);
  },

  /**
   * เรียงลำดับสินค้า
   */
  sortProducts(products, sortBy = 'name', order = 'asc') {
    return [...products].sort((a, b) => {
      let compareA = a[sortBy];
      let compareB = b[sortBy];

      if (sortBy === 'price') {
        compareA = parseFloat(compareA);
        compareB = parseFloat(compareB);
      }

      if (order === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });
  },

  /**
   * อัพเดทสถานะการมีสินค้า
   */
  updateProductAvailability(productId, available, stock = 0) {
    const productElement = this.elements.productGrid
      .querySelector(`[data-id="${productId}"]`);

    if (productElement) {
      const button = productElement.querySelector('.add-to-cart-btn');
      if (button) {
        button.disabled = !available;
        button.textContent = available ? 'เพิ่มลงตะกร้า' : 'สินค้าหมด';
      }

      const stockElement = productElement.querySelector('.product-stock');
      if (stockElement) {
        stockElement.textContent = `เหลือ ${stock} ชิ้น`;
        stockElement.classList.toggle('low-stock', stock < 5);
      }
    }
  },

  /**
   * รีเฟรชข้อมูลสินค้าเฉพาะรายการ
   */
  refreshProduct(productId) {
    const product = State.products.find(p => p.id === productId);
    if (!product) return;

    const productElement = this.elements.productGrid
      .querySelector(`[data-id="${productId}"]`);
    if (productElement) {
      const newElement = TemplateManager.create('product-card-template', {
        id: product.id,
        name: product.name,
        image: product.image,
        formattedPrice: Utils.formatCurrency(product.price),
        hasNutrition: !!product.nutrition,
        ...product.nutrition,
        inStock: product.stock > 0
      });

      productElement.replaceWith(newElement);
    }
  },

  /**
   * สร้างสไตล์สำหรับแท็ก
   * @param {string} tag - ชื่อแท็ก
   * @returns {string} สไตล์ CSS สำหรับแท็ก
   */
  getTagStyle(tag) {
    const tagStyles = {
      'new': 'background-color: var(--tag-new)',
      'sale': 'background-color: var(--tag-sale)',
      'best-seller': 'background-color: var(--tag-best-seller)',
      'recommended': 'background-color: var(--tag-recommended)',
      'promotion': 'background-color: var(--tag-promotion)'
    };
    return tagStyles[tag] || '';
  }
};