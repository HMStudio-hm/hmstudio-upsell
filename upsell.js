// src/scripts/upsell.js v1.0.9
// HMStudio Upsell Feature

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

        // Title
        const title = document.createElement('h3');
        title.style.cssText = `
          font-size: 1.5em;
          margin: 0 0 20px;
          padding-${isRTL ? 'left' : 'right'}: 30px;
        `;
        title.textContent = currentLang === 'ar' ? 'عروض خاصة لك!' : 'Special Offers for You!';

        // Subtitle with trigger product name
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
      const card = document.createElement('div');
      card.className = 'hmstudio-upsell-product-card';
      card.style.cssText = `
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 15px;
        text-align: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      `;

      // Create form with Zid's expected structure
      const form = document.createElement('form');
      form.id = 'product-form';
      form.setAttribute('data-product-id', product.id);
      
      // Create options container
      const optionsContainer = document.createElement('div');
      optionsContainer.id = 'product-options';
      form.appendChild(optionsContainer);

      // Add hidden inputs
      const productIdInput = document.createElement('input');
      productIdInput.type = 'hidden';
      productIdInput.id = 'product-id';
      productIdInput.name = 'product_id';
      productIdInput.value = product.id;
      form.appendChild(productIdInput);

      const quantityInput = document.createElement('input');
      quantityInput.type = 'hidden';
      quantityInput.id = 'product-quantity';
      quantityInput.name = 'quantity';
      quantityInput.value = '1';
      form.appendChild(quantityInput);

      // Create the product details HTML
      const productContent = document.createElement('div');
      productContent.innerHTML = `
        <img 
          src="${product.thumbnail}" 
          alt="${product.name}" 
          style="width: 100%; height: 150px; object-fit: contain; margin-bottom: 10px;"
        >
        <h4 style="font-size: 1em; margin: 10px 0; min-height: 40px;">
          ${product.name}
        </h4>
      `;

      // Quantity selector container
      const quantityContainer = document.createElement('div');
      quantityContainer.style.cssText = `
        margin: 15px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      `;

      // Quantity label
      const quantityLabel = document.createElement('label');
      quantityLabel.textContent = isRTL ? 'الكمية:' : 'Quantity:';
      quantityLabel.style.cssText = `
        font-size: 0.9em;
        color: #666;
      `;

      // Quantity controls wrapper
      const quantityWrapper = document.createElement('div');
      quantityWrapper.style.cssText = `
        display: flex;
        align-items: center;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: hidden;
      `;

      // Decrease button
      const decreaseBtn = document.createElement('button');
      decreaseBtn.type = 'button';
      decreaseBtn.textContent = '-';
      decreaseBtn.style.cssText = `
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

      // Quantity display input
      const quantityDisplayInput = document.createElement('input');
      quantityDisplayInput.type = 'number';
      quantityDisplayInput.min = '1';
      quantityDisplayInput.max = '10';
      quantityDisplayInput.value = '1';
      quantityDisplayInput.style.cssText = `
        width: 40px;
        height: 28px;
        border: none;
        border-left: 1px solid #ddd;
        border-right: 1px solid #ddd;
        text-align: center;
        font-size: 14px;
        -moz-appearance: textfield;
      `;

      // Increase button
      const increaseBtn = document.createElement('button');
      increaseBtn.type = 'button';
      increaseBtn.textContent = '+';
      increaseBtn.style.cssText = `
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

      // Add button hover effects
      [decreaseBtn, increaseBtn].forEach(btn => {
        btn.addEventListener('mouseover', () => {
          btn.style.backgroundColor = '#e0e0e0';
        });
        btn.addEventListener('mouseout', () => {
          btn.style.backgroundColor = '#f5f5f5';
        });
      });

      // Add quantity change handlers
      decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityDisplayInput.value);
        if (currentValue > 1) {
          const newValue = currentValue - 1;
          quantityDisplayInput.value = newValue;
          quantityInput.value = newValue;
        }
      });

      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityDisplayInput.value);
        if (currentValue < 10) {
          const newValue = currentValue + 1;
          quantityDisplayInput.value = newValue;
          quantityInput.value = newValue;
        }
      });

      // Prevent scrolling when focusing input on mobile
      quantityDisplayInput.addEventListener('focus', (e) => {
        e.preventDefault();
        if (window.innerWidth <= 768) {
          quantityDisplayInput.blur();
        }
      });

      // Validate input
      quantityDisplayInput.addEventListener('input', () => {
        let value = parseInt(quantityDisplayInput.value);
        if (isNaN(value) || value < 1) {
          value = 1;
        } else if (value > 10) {
          value = 10;
        }
        quantityDisplayInput.value = value;
        quantityInput.value = value;
      });

      // Add to cart button
      const addButton = document.createElement('button');
      addButton.type = 'submit';
      addButton.className = 'btn btn-add-to-cart hmstudio-upsell-add-to-cart';
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
      `;
      addButton.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';

      // Add to cart event listener
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const quantity = parseInt(quantityInput.value);
        this.addToCart(product, quantity, form);
      });

      // Assemble quantity controls
      quantityWrapper.appendChild(decreaseBtn);
      quantityWrapper.appendChild(quantityDisplayInput);
      quantityWrapper.appendChild(increaseBtn);

      quantityContainer.appendChild(quantityLabel);
      quantityContainer.appendChild(quantityWrapper);

      // Assemble the card
      card.appendChild(productContent);
      card.appendChild(form);
      card.appendChild(quantityContainer);
      card.appendChild(addButton);

      // Hover effects for card
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

    async addToCart(product, quantity, form) {
      try {
        const response = await window.zid.store.cart.addProduct({
          formId: 'product-form',
          data: {
            product_id: product.id,
            quantity: quantity
          }
        });

        console.log('Add to cart response:', response);

        if (response && response.status === 'success') {
          // Update cart badge if function exists
          if (typeof setCartBadge === 'function' && response.data && response.data.cart) {
            setCartBadge(response.data.cart.products_count);
          }

          // Update mini cart if function exists
          if (typeof updateMiniCart === 'function') {
            updateMiniCart();
          }

          // Close modal
          this.closeModal();

          // Show success message
          const message = getCurrentLanguage() === 'ar'
            ? 'تمت إضافة المنتج إلى السلة بنجاح'
            : 'Product added to cart successfully';
          
          if (window.toastr) {
            window.toastr.success(message);
          } else {
            alert(message);
          }
        } else {
          throw new Error('Failed to add product to cart');
        }
      } catch (error) {
        console.error('Error adding product to cart:', error);
        
        const errorMessage = getCurrentLanguage() === 'ar'
          ? 'حدث خطأ أثناء إضافة المنتج إلى السلة'
          : 'Error occurred while adding product to cart';
        
        if (window.toastr) {
          window.toastr.error(errorMessage);
        } else {
          alert(errorMessage);
        }
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
      
      // Make sure the global object is available
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
