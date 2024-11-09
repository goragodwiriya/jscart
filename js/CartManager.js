/**
 * ระบบจัดการตะกร้าสินค้า
 * รับผิดชอบการจัดการสินค้าในตะกร้า การคำนวณราคา และการแสดงผล
 */
const CartManager = {
  /**
   * เริ่มต้นระบบตะกร้าสินค้า
   */
  init() {
    this.setupTemplates();
    this.loadCart();
    this.setupEventListeners();
    this.updateCartCount();

    // ตรวจสอบความถูกต้องของสินค้าในตะกร้า
    if (State.products?.length) {
      this.validateCartItems();
    } else {
      EventBus.on('products:loaded', () => {
        this.validateCartItems();
      });
    }
  },

  /**
   * ตั้งค่าเทมเพลตสำหรับตะกร้าสินค้า
   */
  setupTemplates() {
    // เทมเพลตหลักของตะกร้าสินค้า
    TemplateManager.registerTemplate('cart-modal-template',
      `<div id="cartModal" class="modal">
        <div class="modal-content glass">
          <div class="modal-header">
            <h2 class="icon-cart">ตะกร้าสินค้า</h2>
            <button class="modal-close" aria-label="ปิด">&times;</button>
          </div>
          <div class="modal-body">
            <div id="cartItems" class="cart-items" data-container="items">
              <!-- รายการสินค้าจะถูกแทรกที่นี่ -->
            </div>
            <div class="cart-summary">
              <div class="summary-row">
                <span>ราคารวม</span>
                <span data-text="subtotal"></span>
              </div>
              <div class="summary-row">
                <span>ค่าจัดส่ง</span>
                <span data-text="deliveryFee"></span>
              </div>
              <div class="summary-row total">
                <span>รวมทั้งสิ้น</span>
                <span data-text="total"></span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button id="clearCartBtn" class="btn btn-secondary"
              data-action="clearCart" data-if="hasItems">ล้างตะกร้า</button>
            <button id="checkoutBtn" class="btn btn-primary"
              data-action="checkout" data-if="hasItems">ดำเนินการสั่งซื้อ</button>
          </div>
        </div>
      </div>`
    );

    // เทมเพลตสำหรับตะกร้าว่าง
    TemplateManager.registerTemplate('empty-cart-template',
      `<div class="empty-cart">
        <i class="icon-shopping-cart"></i>
        <p>ไม่มีสินค้าในตะกร้า</p>
      </div>`
    );

    // เทมเพลตสำหรับรายการสินค้าแต่ละชิ้น
    TemplateManager.registerTemplate('cart-item-template',
      `<div class="cart-item">
        <div class="cart-item-image">
          <img data-attr="src:image;alt:name" loading="lazy">
        </div>
        <div class="cart-item-content">
          <div class="cart-item-header">
            <h4 class="cart-item-title" data-text="name"></h4>
            <button class="cart-item-remove icon-delete"
              data-action="remove" data-attr="data-product-id:id"></button>
          </div>
          <div class="cart-item-price" data-text="formattedPrice"></div>
          <div class="cart-item-controls">
            <div class="quantity-controls">
              <button class="btn cart-item-decrease"
                data-action="update" data-change="-1"
                data-attr="data-product-id:id;disabled:disableDecrease">-</button>
              <span class="quantity" data-text="quantity"></span>
              <button class="btn cart-item-increase"
                data-action="update" data-change="1"
                data-attr="data-product-id:id;disabled:disableIncrease">+</button>
            </div>
            <div class="item-total">รวม: <span data-text="total"></span></div>
          </div>
        </div>
      </div>`
    );
  },

  /**
   * โหลดข้อมูลตะกร้าจาก localStorage
   */
  loadCart() {
    try {
      const savedCart = localStorage.getItem(CONFIG.STORAGE_KEYS.CART);
      State.cart = savedCart ? JSON.parse(savedCart) : [];
      State.cart.lastUpdated = new Date().toISOString();
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดตะกร้า:', error);
      State.cart = [];
      NotificationManager.error('เกิดข้อผิดพลาดในการโหลดข้อมูลตะกร้า');
    }
  },

  /**
   * ตรวจสอบความถูกต้องของสินค้าในตะกร้า
   * - ตรวจสอบราคาและชื่อสินค้า
   * - ตรวจสอบจำนวนสินค้าในสต็อก
   */
  validateCartItems() {
    if (!State.products?.length) return;

    let hasChanges = false;

    State.cart = State.cart.filter(item => {
      const product = State.products.find(p => p.id === item.id);
      if (!product) return true;

      // ตรวจสอบการเปลี่ยนแปลงของราคาและชื่อสินค้า
      if (item.price !== product.price || item.name !== product.name) {
        item.price = product.price;
        item.name = product.name;
        hasChanges = true;
      }

      // ตรวจสอบจำนวนสินค้าในสต็อก
      if (item.quantity > product.stock) {
        item.quantity = product.stock;
        hasChanges = true;
        NotificationManager.warning(
          `ปรับจำนวน ${product.name} เหลือ ${product.stock} ชิ้น เนื่องจากสินค้าในสต็อกไม่เพียงพอ`
        );
      }

      return true;
    });

    if (hasChanges) {
      this.saveCart();
      this.updateCartDisplay();
    }
  },

  /**
   * ตั้งค่าตัวรับฟังเหตุการณ์สำหรับการทำงานต่างๆ
   */
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      const action = target.dataset.action;

      if (!action) {
        if (target.id === 'cartBtn') {
          this.showCart();
        }
        return;
      }

      switch (action) {
        case 'addToCart':
          const productId = target.dataset.productId;
          this.addToCart(this.findProduct(productId));
          break;

        case 'remove':
          this.showConfirmRemove(target.dataset.productId);
          break;

        case 'update':
          const change = parseInt(target.dataset.change) || 0;
          this.updateQuantity(target.dataset.productId, change);
          break;

        case 'clearCart':
          this.showConfirmClear();
          break;

        case 'checkout':
          if (this.validateCheckout()) {
            TemplateManager.closeAllModals();
            CheckoutManager.startCheckout();
          }
          break;
      }
    });

    // รับฟังการเปลี่ยนแปลงจำนวนสินค้าในสต็อก
    EventBus.on('product:stockChanged', ({productId, newStock}) => {
      this.handleStockChange(productId, newStock);
    });
  },

  /**
   * แสดงหน้าต่างตะกร้าสินค้า
   */
  showCart() {
    const cartItems = this.getCartItems();
    const cartTotal = this.getCartTotal();
    const hasItems = cartItems.length > 0;

    const modal = TemplateManager.showModal('cart-modal-template', {
      items: hasItems ? this.renderCartItems(cartItems) : this.renderEmptyCart(),
      subtotal: Utils.formatCurrency(cartTotal.subtotal),
      deliveryFee: Utils.formatCurrency(cartTotal.deliveryFee),
      total: Utils.formatCurrency(cartTotal.total),
      hasItems
    });

    if (!modal) {
      NotificationManager.error('ไม่สามารถแสดงตะกร้าสินค้าได้');
    }
  },

  /**
   * สร้าง HTML สำหรับแสดงรายการสินค้าในตะกร้า
   */
  renderCartItems(items) {
    return items.map(item => {
      return TemplateManager.create('cart-item-template', {
        id: item.id,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        formattedPrice: `฿${item.price.toLocaleString()}`,
        formattedTotal: `฿${(item.price * item.quantity).toLocaleString()}`,
        disableDecrease: item.quantity <= 1,
        disableIncrease: item.quantity >= item.stock
      });
    });
  },

  /**
   * สร้าง HTML สำหรับแสดงตะกร้าว่าง
   */
  renderEmptyCart() {
    return [TemplateManager.create('empty-cart-template')];
  },

  /**
   * แสดงการยืนยันการลบสินค้า
   */
  showConfirmRemove(productId) {
    const product = this.findProduct(productId);
    if (!product) return;

    if (confirm(`คุณต้องการลบ ${product.name} ออกจากตะกร้าใช่หรือไม่?`)) {
      this.removeFromCart(productId);
      TemplateManager.closeAllModals();
      this.showCart();
    }
  },

  /**
   * แสดงการยืนยันการล้างตะกร้า
   */
  showConfirmClear() {
    if (confirm('คุณต้องการล้างตะกร้าสินค้าทั้งหมดใช่หรือไม่?')) {
      this.clearCart();
      TemplateManager.closeAllModals();
    }
  },

  /**
   * เพิ่มสินค้าลงในตะกร้า
   */
  addToCart(product) {
    if (!product || !product.id) {
      NotificationManager.error('ไม่พบข้อมูลสินค้า');
      return;
    }

    try {
      const existingItem = State.cart.find(item => item.id === product.id);

      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          NotificationManager.warning('ขออภัย สินค้าในสต็อกไม่เพียงพอ');
          return;
        }
        existingItem.quantity += 1;
      } else {
        State.cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1,
          stock: product.stock
        });
      }

      this.updateCartCount();
      this.saveCart();
      this.animateCartButton();
      NotificationManager.success(`เพิ่ม${product.name}ลงตะกร้าแล้ว`);

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเพิ่มสินค้า:', error);
      NotificationManager.error('เกิดข้อผิดพลาดในการเพิ่มสินค้า');
    }
  },

  /**
   * อัพเดทจำนวนสินค้าในตะกร้า
   */
  updateQuantity(productId, change) {
    const item = State.cart.find(item => item.id === productId);
    if (!item) return;

    const newQuantity = item.quantity + change;
    const product = this.findProduct(productId);

    // ตรวจสอบจำนวนขั้นต่ำ
    if (newQuantity <= 0) {
      this.showConfirmRemove(productId);
      return;
    }

    // ตรวจสอบสต็อกสินค้า
    if (product && newQuantity > product.stock) {
      NotificationManager.warning('ขออภัย สินค้าในสต็อกไม่เพียงพอ');
      return;
    }

    item.quantity = newQuantity;
    this.updateCartCount();
    this.saveCart();
    this.updateCartDisplay();
  },

  /**
   * ลบสินค้าออกจากตะกร้า
   */
  removeFromCart(productId) {
    State.cart = State.cart.filter(item => item.id !== productId);
    this.updateCartCount();
    this.saveCart();
    NotificationManager.info('ลบสินค้าออกจากตะกร้าแล้ว');
  },

  /**
   * ล้างตะกร้าทั้งหมด
   */
  clearCart() {
    if (State.cart.length === 0) return;

    State.cart = [];
    this.updateCartCount();
    this.saveCart();
    NotificationManager.info('ล้างตะกร้าสินค้าแล้ว');
  },

  /**
   * ตรวจสอบความถูกต้องก่อนการสั่งซื้อ
   */
  validateCheckout() {
    if (State.cart.length === 0) {
      NotificationManager.warning('ไม่มีสินค้าในตะกร้า');
      return false;
    }

    const total = this.getCartTotal();
    if (total.subtotal < CONFIG.BUSINESS.MIN_ORDER_AMOUNT) {
      NotificationManager.warning(`ยอดสั่งซื้อขั้นต่ำ ฿${CONFIG.BUSINESS.MIN_ORDER_AMOUNT}`);
      return false;
    }

    const totalItems = State.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > CONFIG.BUSINESS.MAX_ITEMS_PER_ORDER) {
      NotificationManager.warning(`สั่งซื้อได้สูงสุด ${CONFIG.BUSINESS.MAX_ITEMS_PER_ORDER} ชิ้นต่อออเดอร์`);
      return false;
    }

    return true;
  },

  /**
   * บันทึกข้อมูลตะกร้าลงใน localStorage
   */
  saveCart() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(State.cart));
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการบันทึกตะกร้า:', error);
      NotificationManager.error('ไม่สามารถบันทึกข้อมูลตะกร้าได้');
    }
  },

  /**
   * อัพเดทจำนวนสินค้าที่แสดงบนไอคอนตะกร้า
   */
  updateCartCount() {
    const count = State.cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
      cartCount.textContent = count;
      cartCount.classList.toggle('hidden', count === 0);
    }
  },

  /**
   * อัพเดทการแสดงผลตะกร้าสินค้า
   */
  updateCartDisplay() {
    const modal = document.querySelector('#cartModal');
    if (!modal) return;

    const cartItems = this.getCartItems();
    const cartTotal = this.getCartTotal();
    const hasItems = cartItems.length > 0;

    this.showCart();
  },

  /**
   * จัดการการเปลี่ยนแปลงจำนวนสินค้าในสต็อก
   */
  handleStockChange(productId, newStock) {
    const cartItem = State.cart.find(item => item.id === productId);
    if (!cartItem) return;

    if (cartItem.quantity > newStock) {
      cartItem.quantity = newStock;
      this.saveCart();
      this.updateCartDisplay();
      NotificationManager.warning(`ปรับจำนวนสินค้าเหลือ ${newStock} ชิ้น เนื่องจากสินค้าในสต็อกไม่เพียงพอ`);
    }
  },

  /**
   * ค้นหาข้อมูลสินค้าจาก ID
   */
  findProduct(productId) {
    return State.products.find(p => p.id === productId);
  },

  /**
   * ดึงรายการสินค้าในตะกร้าพร้อมข้อมูลที่จำเป็น
   */
  getCartItems() {
    return State.cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      total: item.price * item.quantity,
      image: item.image,
      stock: item.stock
    }));
  },

  /**
   * คำนวณราคารวมของสินค้าในตะกร้า
   * @returns {Object} ข้อมูลราคา ประกอบด้วย subtotal, deliveryFee และ total
   */
  getCartTotal() {
    const subtotal = State.cart.reduce((sum, item) =>
      sum + (item.price * item.quantity), 0
    );

    const deliveryFee = subtotal >= CONFIG.BUSINESS.FREE_DELIVERY_AMOUNT ? 0 : 50;

    return {
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee
    };
  },

  /**
   * แสดงแอนิเมชันปุ่มตะกร้าเมื่อเพิ่มสินค้า
   */
  animateCartButton() {
    const button = document.getElementById('cartBtn');
    if (button) {
      button.classList.add('bounce');
      setTimeout(() => button.classList.remove('bounce'), 300);
    }
  }
};