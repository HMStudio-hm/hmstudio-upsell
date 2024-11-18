// src/scripts/upsell.js v1.2.4
// HMStudio Upsell Feature with Variant Support

(function() {
  console.log('Upsell script initialized');

  function getStoreIdFromUrl() {
    const scriptTag = document.currentScript;
    const scriptUrl = new URL(scriptTag.src);
    const storeId = scriptUrl.searchParams.get('storeId');
    return storeId ? storeId.split('?')[0] : null;
  }

  function getCampaignsFromUrl() {
    const scriptTag = document.currentScript;
    const scriptUrl = new URL(scriptTag.src);
    const campaignsData = scriptUrl.searchParams.get('campaigns');
    
    console.log('Raw campaigns data:', campaignsData);
    
    if (!campaignsData) {
      console.log('No campaigns data found in URL');
      return [];
    }

    try {
      const decodedData = atob(campaignsData);
      const parsedData = JSON.parse(decodedData);
      console.log('Parsed campaigns data:', parsedData);
      return parsedData;
    } catch (error) {
      console.error('Error parsing campaigns data:', error);
      return [];
    }
  }

  function getCurrentLanguage() {
    return document.documentElement.lang || 'ar';
  }

  const storeId = getStoreIdFromUrl();
  if (!storeId) {
    console.error('Store ID not found in script URL');
    return;
  }

  const UpsellManager = {
    campaigns: getCampaignsFromUrl(),
    currentModal: null,
    activeTimeout: null,

    showUpsellModal(campaign, productCart) {
      console.log('showUpsellModal called with:', { campaign, productCart });
      
      if (!campaign || !campaign.upsellProducts || campaign.upsellProducts.length === 0) {
        console.warn('Invalid campaign data:', campaign);
        return;
      }

      const currentLang = getCurrentLanguage();
      const isRTL = currentLang === 'ar';

      try {
        // Remove existing modal if any
        if (this.currentModal) {
          this.currentModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'hmstudio-upsell-modal';
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 999999;
          opacity: 0;
          transition: opacity 0.3s ease;
        `;

        const content = document.createElement('div');
        content.className = 'hmstudio-upsell-content';
        content.style.cssText = `
          background: white;
          padding: 25px;
          border-radius: 8px;
          max-width: 800px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          transform: translateY(20px);
          transition: transform 0.3s ease;
          direction: ${isRTL ? 'rtl' : 'ltr'};
        `;

        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
          position: absolute;
          top: 15px;
          ${isRTL ? 'left' : 'right'}: 15px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          padding: 5px;
          line-height: 1;
        `;
        closeButton.addEventListener('click', () => this.closeModal());

        // Title and subtitle
        const title = document.createElement('h3');
        title.style.cssText = `
          font-size: 1.5em;
          margin: 0 0 20px;
          padding-${isRTL ? 'left' : 'right'}: 30px;
        `;
        title.textContent = currentLang === 'ar' ? 'عروض خاصة لك!' : 'Special Offers for You!';

        const subtitle = document.createElement('p');
        subtitle.style.cssText = `
          color: #666;
          margin-bottom: 20px;
          font-size: 1.1em;
        `;
        subtitle.textContent = currentLang === 'ar' 
          ? `أضف هذه المنتجات المكملة لـ ${productCart.name}!`
          : `Add these complementary products for ${productCart.name}!`;

        // Products grid
        const productsGrid = document.createElement('div');
        productsGrid.style.cssText = `
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 20px;
        `;

        // Add upsell products
        campaign.upsellProducts.forEach(product => {
          const productCard = this.createProductCard(product);
          productsGrid.appendChild(productCard);
        });

        // Assemble modal
        content.appendChild(closeButton);
        content.appendChild(title);
        content.appendChild(subtitle);
        content.appendChild(productsGrid);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Show modal with animation
        requestAnimationFrame(() => {
          modal.style.opacity = '1';
          content.style.transform = 'translateY(0)';
        });

        this.currentModal = modal;

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeModal();
          }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            this.closeModal();
          }
        });

        console.log('Modal created successfully');
      } catch (error) {
        console.error('Error creating upsell modal:', error);
      }
    },

    createProductCard(product) {
      const currentLang = getCurrentLanguage();
      const isRTL = currentLang === 'ar';

      let productName = product.name;
      if (typeof product.name === 'object') {
        productName = currentLang === 'ar' ? product.name.ar : product.name.en;
      }
      try {
        productName = decodeURIComponent(escape(productName));
      } catch (e) {
        console.warn('Error decoding product name:', e);
      }

      const card = document.createElement('div');
      card.className = 'hmstudio-upsell-product-card';
      card.style.cssText = `
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 15px;
        text-align: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      `;

      // Create form with proper hidden inputs
      const form = document.createElement('form');
      form.id = `product-form-${product.id}`; // Unique ID for each form

      // Product ID input
      const productIdInput = document.createElement('input');
      productIdInput.type = 'hidden';
      productIdInput.id = `product-id-${product.id}`;
      productIdInput.name = 'product_id';
      productIdInput.value = product.selected_product?.id || product.id;
      form.appendChild(productIdInput);

      // Hidden quantity input
      const quantityInputHidden = document.createElement('input');
      quantityInputHidden.type = 'hidden';
      quantityInputHidden.id = `product-quantity-${product.id}`;
      quantityInputHidden.name = 'quantity';
      quantityInputHidden.value = '1';
      form.appendChild(quantityInputHidden);

      // Basic product info
      const productInfo = document.createElement('div');
      productInfo.innerHTML = `
        <img 
          src="${product.thumbnail}" 
          alt="${productName}" 
          style="width: 100%; height: 150px; object-fit: contain; margin-bottom: 10px;"
        >
        <h4 style="font-size: 1em; margin: 10px 0; min-height: 40px;">
          ${productName}
        </h4>
      `;
      card.appendChild(productInfo);

      // Variants section
      if (product.variants && product.variants.length > 0) {
        const variantsContainer = document.createElement('div');
        variantsContainer.className = 'hmstudio-upsell-variants';
        variantsContainer.style.cssText = `
          margin: 15px 0;
          text-align: ${isRTL ? 'right' : 'left'};
        `;

        // Create dropdowns for each variant type
        const variantTypes = new Map();
        product.variants.forEach(variant => {
          if (variant.attributes) {
            variant.attributes.forEach(attr => {
              if (!variantTypes.has(attr.name)) {
                variantTypes.set(attr.name, {
                  name: attr.name,
                  slug: attr.slug,
                  values: new Set()
                });
              }
              variantTypes.get(attr.name).values.add(attr.value[currentLang]);
            });
          }
        });

        variantTypes.forEach((variantType, typeName) => {
          const select = document.createElement('select');
          select.className = 'variant-select';
          select.style.cssText = `
            width: 100%;
            margin: 5px 0;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
          `;

          const label = document.createElement('label');
          label.textContent = currentLang === 'ar' ? variantType.slug : variantType.name;
          label.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            font-size: 0.9em;
          `;

          // Add placeholder option
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = currentLang === 'ar' ? 
            `اختر ${variantType.slug}` : 
            `Select ${variantType.name}`;
          select.appendChild(placeholder);

          // Add variant options
          Array.from(variantType.values).forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
          });

          // Handle variant selection
          select.addEventListener('change', () => {
            this.updateSelectedVariant(product, form);
          });

          variantsContainer.appendChild(label);
          variantsContainer.appendChild(select);
        });

        card.appendChild(variantsContainer);

        // Price display elements
        const priceDisplay = document.createElement('div');
        priceDisplay.style.cssText = `
          margin: 10px 0;
          font-size: 1.1em;
          font-weight: bold;
        `;

        const currentPrice = document.createElement('span');
        currentPrice.id = `product-price-${product.id}`;
        currentPrice.style.color = 'var(--theme-primary, #00b286)';
        
        const oldPrice = document.createElement('span');
        oldPrice.id = `product-old-price-${product.id}`;
        oldPrice.style.cssText = `
          text-decoration: line-through;
          color: #999;
          margin-${isRTL ? 'right' : 'left'}: 10px;
          display: none;
        `;

        priceDisplay.appendChild(currentPrice);
        priceDisplay.appendChild(oldPrice);
        card.appendChild(priceDisplay);

        // Initialize price display
        if (product.selected_product) {
          if (product.selected_product.formatted_sale_price) {
            currentPrice.textContent = product.selected_product.formatted_sale_price;
            oldPrice.textContent = product.selected_product.formatted_price;
            oldPrice.style.display = 'inline';
          } else {
            currentPrice.textContent = product.selected_product.formatted_price;
          }
        } else {
          currentPrice.textContent = product.formatted_price;
        }
      }

      // Quantity selector
      const quantityContainer = this.createQuantitySelector(product.id, quantityInputHidden, currentLang);
      card.appendChild(quantityContainer);

      // Add to cart button
      const addButton = document.createElement('button');
      addButton.className = 'hmstudio-upsell-add-to-cart';
      addButton.style.cssText = `
        background: var(--theme-primary, #00b286);
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        transition: opacity 0.2s;
        margin-top: 10px;
        font-weight: 500;
      `;
      addButton.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
      addButton.addEventListener('click', () => this.addToCart(product, form));

      card.appendChild(form);
      card.appendChild(addButton);

      // Hover effects
      card.addEventListener('mouseover', () => {
        card.style.transform = 'translateY(-5px)';
        card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      });

      card.addEventListener('mouseout', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      });

      return card;
    },

    createQuantitySelector(productId, hiddenInput, currentLang) {
      const container = document.createElement('div');
      container.style.cssText = `
        margin: 15px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      `;

      const label = document.createElement('label');
      label.textContent = currentLang === 'ar' ? 'الكمية:' : 'Quantity:';
      label.style.cssText = `
        font-size: 0.9em;
        color: #666;
      `;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        display: flex;
        align-items: center;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: hidden;
      `;

      const createButton = (text, action) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = text;
        btn.style.cssText = `
          width: 28px;
          height: 28px;
          border: none;
          background: #f5f5f5;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: background-color 0.3s ease;
        `;

        btn.addEventListener('mouseover', () => {
          btn.style.backgroundColor = '#e0e0e0';
        });
        btn.addEventListener('mouseout', () => {
          btn.style.backgroundColor = '#f5f5f5';
        });
        btn.addEventListener('click', action);

        return btn;
      };

      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.max = '10';
      quantityInput.value = '1';
      quantityInput.style.cssText = `
        width: 40px;
        height: 28px;
        border: none;
        border-left: 1px solid #ddd;
        border-right: 1px solid #ddd;
        text-align: center;
        font-size: 14px;
        -moz-appearance: textfield;
      `;

      quantityInput.addEventListener('change', () => {
        let value = parseInt(quantityInput.value);
        if (isNaN(value) || value < 1) value = 1;
        if (value > 10) value = 10;
        quantityInput.value = value;
        hiddenInput.value = value;
      });

      const decreaseBtn = createButton('-', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
          quantityInput.value = currentValue - 1;
          hiddenInput.value = currentValue - 1;
        }
      });

      const increaseBtn = createButton('+', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue < 10) {
          quantityInput.value = currentValue + 1;
          hiddenInput.value = currentValue + 1;
        }
      });

      wrapper.appendChild(decreaseBtn);
      wrapper.appendChild(quantityInput);
      wrapper.appendChild(increaseBtn);

      container.appendChild(label);
      container.appendChild(wrapper);

      return container;
  },

  updateSelectedVariant(product, form) {
    const currentLang = getCurrentLanguage();
    const selectedValues = {};
    
    form.querySelectorAll('.variant-select').forEach(select => {
      if (select.value) {
        const labelText = select.previousElementSibling.textContent;
        selectedValues[labelText] = select.value;
      }
    });

    const selectedVariant = product.variants.find(variant => {
      return variant.attributes.every(attr => {
        const attrLabel = currentLang === 'ar' ? attr.slug : attr.name;
        return selectedValues[attrLabel] === attr.value[currentLang];
      });
    });

    if (selectedVariant) {
      // Update product ID
      const productIdInput = form.querySelector(`#product-id-${product.id}`);
      if (productIdInput) {
        productIdInput.value = selectedVariant.id;
      }

      // Update price display
      const priceElement = document.getElementById(`product-price-${product.id}`);
      const oldPriceElement = document.getElementById(`product-old-price-${product.id}`);
      
      if (priceElement) {
        if (selectedVariant.formatted_sale_price) {
          priceElement.textContent = selectedVariant.formatted_sale_price;
          if (oldPriceElement) {
            oldPriceElement.textContent = selectedVariant.formatted_price;
            oldPriceElement.style.display = 'inline';
          }
        } else {
          priceElement.textContent = selectedVariant.formatted_price;
          if (oldPriceElement) {
            oldPriceElement.style.display = 'none';
          }
        }
      }

      // Update add to cart button state
      const addButton = form.parentElement.querySelector('.hmstudio-upsell-add-to-cart');
      if (addButton) {
        if (!selectedVariant.unavailable) {
          addButton.disabled = false;
          addButton.style.opacity = '1';
          addButton.style.cursor = 'pointer';
        } else {
          addButton.disabled = true;
          addButton.style.opacity = '0.5';
          addButton.style.cursor = 'not-allowed';
        }
      }
    }
  },

  async addToCart(product, form) {
    try {
      const formData = new FormData(form);
      console.log('Form data being submitted:', {
        product_id: formData.get('product_id'),
        quantity: formData.get('quantity')
      });

      const response = await zid.store.cart.addProduct({ 
        formId: form.id,
        data: {
          product_id: formData.get('product_id'),
          quantity: formData.get('quantity')
        }
      });

      console.log('Add to cart response:', response);
      if (response.status === 'success') {
        if (typeof setCartBadge === 'function') {
          setCartBadge(response.data.cart.products_count);
        }
        this.closeModal();
      } else {
        const errorMessage = getCurrentLanguage() === 'ar' 
          ? response.data.message || 'فشل إضافة المنتج إلى السلة'
          : response.data.message || 'Failed to add product to cart';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMessage = getCurrentLanguage() === 'ar' 
        ? 'حدث خطأ أثناء إضافة المنتج إلى السلة'
        : 'Error occurred while adding product to cart';
      alert(errorMessage);
    }
  },

  closeModal() {
    if (this.currentModal) {
      this.currentModal.style.opacity = '0';
      this.currentModal.querySelector('.hmstudio-upsell-content').style.transform = 'translateY(20px)';
      setTimeout(() => {
        this.currentModal.remove();
        this.currentModal = null;
      }, 300);
    }
  },

  initialize() {
    console.log('Initializing Upsell');
    
    // Make global object available
    if (!window.HMStudioUpsell) {
      window.HMStudioUpsell = {
        showUpsellModal: (...args) => {
          console.log('showUpsellModal called with args:', args);
          return this.showUpsellModal.apply(this, args);
        },
        closeModal: () => this.closeModal()
      };
      console.log('Global HMStudioUpsell object created');
    }

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentModal) {
        this.closeModal();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.currentModal) {
        const content = this.currentModal.querySelector('.hmstudio-upsell-content');
        if (content) {
          content.style.maxHeight = `${window.innerHeight * 0.9}px`;
        }
      }
    });
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    UpsellManager.initialize();
  });
} else {
  UpsellManager.initialize();
}
})();
