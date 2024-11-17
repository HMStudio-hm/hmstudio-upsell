// src/scripts/upsell.js v1.1.7
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

      // Helper function for decoding names
      const decodeProductName = (name) => {
        if (!name) return '';
        try {
          return decodeURIComponent(escape(name));
        } catch (e) {
          try {
            return decodeURIComponent(name);
          } catch (e2) {
            console.warn('Could not decode product name:', e2);
            return name;
          }
        }
      };

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

        // Subtitle with trigger product name (decode the product name)
        const subtitle = document.createElement('p');
        subtitle.style.cssText = `
          color: #666;
          margin-bottom: 20px;
          font-size: 1.1em;
        `;
        const decodedProductName = decodeProductName(productCart.name);
        subtitle.textContent = currentLang === 'ar' 
          ? `أضف هذه المنتجات المكملة لـ ${decodedProductName}!`
          : `Add these complementary products for ${decodedProductName}!`;

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
      console.log('Creating card for product:', product);
      const currentLang = getCurrentLanguage();
      const isRTL = currentLang === 'ar';
      const uniqueId = `product-form-${product.id}`;

      // Helper function for name decoding
      const decodeProductName = (name) => {
        if (!name) return '';
        try {
          return decodeURIComponent(escape(name));
        } catch (e) {
          try {
            return decodeURIComponent(name);
          } catch (e2) {
            console.warn('Could not decode product name:', e2);
            return name;
          }
        }
      };

      // Get the correct product name
      let productName = product.name;
      if (typeof product.name === 'object') {
        productName = currentLang === 'ar' ? product.name.ar : product.name.en;
      }
      productName = decodeProductName(productName);

      const card = document.createElement('div');
      card.className = 'hmstudio-upsell-product-card';
      card.style.cssText = `
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 15px;
        text-align: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      `;

      // Create form with proper variant handling
      const form = document.createElement('form');
      form.id = uniqueId;

      // Product ID input
      const productIdInput = document.createElement('input');
      productIdInput.type = 'hidden';
      productIdInput.id = 'product-id';
      productIdInput.value = product.selected_product ? product.selected_product.id : product.id;
      form.appendChild(productIdInput);

      // Quantity input
      const quantityInput = document.createElement('input');
      quantityInput.type = 'hidden';
      quantityInput.id = 'product-quantity';
      quantityInput.value = '1';
      form.appendChild(quantityInput);

      // Product content
      const productContent = `
        <img 
          src="${product.thumbnail}" 
          alt="${productName}" 
          style="width: 100%; height: 150px; object-fit: contain; margin-bottom: 10px;"
        >
        <h4 style="font-size: 1em; margin: 10px 0; min-height: 40px;">
          ${productName}
        </h4>
      `;

      // Price display section
      const priceSection = document.createElement('div');
      priceSection.className = 'price-section';
      priceSection.style.cssText = 'margin: 10px 0;';

      const regularPrice = document.createElement('span');
      regularPrice.id = `${uniqueId}-price`;
      regularPrice.className = 'product-price';
      regularPrice.style.cssText = 'font-weight: bold; color: var(--theme-primary, #00b286);';
      
      const oldPrice = document.createElement('span');
      oldPrice.id = `${uniqueId}-old-price`;
      oldPrice.className = 'product-old-price';
      oldPrice.style.cssText = 'text-decoration: line-through; color: #999; margin-left: 8px; display: none;';

      priceSection.appendChild(regularPrice);
      priceSection.appendChild(oldPrice);

      // Add components to card
      card.innerHTML = productContent;
      card.appendChild(form);
      card.appendChild(priceSection);

      // Handle variants if product has them
      if (product.variants && product.variants.length > 0) {
        console.log('Product has variants:', product.variants);
        
        const variantsContainer = document.createElement('div');
        variantsContainer.className = 'variants-container';
        variantsContainer.style.cssText = 'margin: 15px 0;';

        // Create dropdowns for each variant type
        const variantTypes = new Set(product.variants.flatMap(v => 
          v.attributes ? v.attributes.map(attr => attr.name) : []
        ));

        variantTypes.forEach(variantType => {
          const variantValues = new Set(product.variants
            .flatMap(v => v.attributes ? v.attributes.filter(attr => attr.name === variantType) : [])
            .map(attr => attr.value));

          const selectContainer = document.createElement('div');
          selectContainer.style.cssText = 'margin-bottom: 10px;';

          const label = document.createElement('label');
          label.textContent = variantType;
          label.style.cssText = 'display: block; margin-bottom: 5px; font-size: 0.9em; color: #666;';

          const select = document.createElement('select');
          select.className = 'variant-select';
          select.style.cssText = `
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 5px;
          `;

          // Add default option
          const defaultOption = document.createElement('option');
          defaultOption.value = '';
          defaultOption.textContent = currentLang === 'ar' 
            ? `اختر ${variantType}`
            : `Select ${variantType}`;
          select.appendChild(defaultOption);

          // Add variant options
          variantValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
          });

          selectContainer.appendChild(label);
          selectContainer.appendChild(select);
          variantsContainer.appendChild(selectContainer);

          // Handle variant changes
          select.addEventListener('change', () => this.handleVariantChange(product, uniqueId));
        });

        card.appendChild(variantsContainer);
      }

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

      // Visible quantity input (for user interaction)
      const visibleQuantityInput = document.createElement('input');
      visibleQuantityInput.type = 'number';
      visibleQuantityInput.min = '1';
      visibleQuantityInput.max = '10';
      visibleQuantityInput.value = '1';
      visibleQuantityInput.style.cssText = `
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
        const currentValue = parseInt(visibleQuantityInput.value);
        if (currentValue > 1) {
          visibleQuantityInput.value = currentValue - 1;
          quantityInput.value = currentValue - 1;
        }
      });

      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(visibleQuantityInput.value);
        if (currentValue < 10) {
          visibleQuantityInput.value = currentValue + 1;
          quantityInput.value = currentValue + 1;
        }
      });

      // Update hidden input when visible quantity changes
      visibleQuantityInput.addEventListener('change', () => {
        let value = parseInt(visibleQuantityInput.value);
        if (isNaN(value) || value < 1) value = 1;
        if (value > 10) value = 10;
        visibleQuantityInput.value = value;
        quantityInput.value = value;
      });

      // Loading spinner
      const spinner = document.createElement('div');
      spinner.className = 'add-to-cart-progress d-none';
      spinner.style.cssText = `
        width: 20px;
        height: 20px;
        border: 2px solid #ffffff;
        border-top: 2px solid transparent;
        border-radius: 50%;
        margin-left: 8px;
        display: inline-block;
      `;

      // Add to cart button
      const addButton = document.createElement('button');
      addButton.className = 'btn btn-primary';
      addButton.type = 'button';
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
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      const buttonText = document.createElement('span');
      buttonText.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
      addButton.appendChild(buttonText);
      addButton.appendChild(spinner);

      // Assemble quantity controls
      quantityWrapper.appendChild(decreaseBtn);
      quantityWrapper.appendChild(visibleQuantityInput);
      quantityWrapper.appendChild(increaseBtn);

      quantityContainer.appendChild(quantityLabel);
      quantityContainer.appendChild(quantityWrapper);

      card.appendChild(quantityContainer);
      card.appendChild(addButton);

      // Add to cart functionality
      addButton.addEventListener('click', () => {
        const progress = card.querySelector('.add-to-cart-progress');
        if (progress) {
          progress.classList.remove('d-none');
        }
        this.productAddToCart(uniqueId, progress);
      });

      // Update initial price display
      if (product.selected_product) {
        this.updatePriceDisplay(product.selected_product, uniqueId);
      } else {
        regularPrice.textContent = product.formatted_price;
      }

      return card;
    },

    handleVariantChange(product, formId) {
      const form = document.getElementById(formId);
      const selects = form.querySelectorAll('.variant-select');
      const selectedValues = Array.from(selects).map(select => select.value);

      // Find matching variant
      const matchingVariant = product.variants.find(variant => {
        if (!variant.attributes) return false;
        return variant.attributes.every(attr => 
          selectedValues.includes(attr.value)
        );
      });

      console.log('Selected variant:', matchingVariant);

      if (matchingVariant) {
        // Update product ID
        const productIdInput = form.querySelector('#product-id');
        if (productIdInput) {
          productIdInput.value = matchingVariant.id;
        }

        // Update price display
        this.updatePriceDisplay(matchingVariant, formId);

        // Enable/disable add to cart button based on availability
        const addButton = form.querySelector('.btn-primary');
        if (addButton) {
          if (!matchingVariant.unavailable) {
            addButton.disabled = false;
            addButton.style.opacity = '1';
          } else {
            addButton.disabled = true;
            addButton.style.opacity = '0.5';
          }
        }
      }
    },

    updatePriceDisplay(variant, formId) {
      const priceElement = document.getElementById(`${formId}-price`);
      const oldPriceElement = document.getElementById(`${formId}-old-price`);
      
      if (priceElement) {
        if (variant.formatted_sale_price) {
          priceElement.textContent = variant.formatted_sale_price;
          if (oldPriceElement) {
            oldPriceElement.textContent = variant.formatted_price;
            oldPriceElement.style.display = 'inline';
          }
        } else {
          priceElement.textContent = variant.formatted_price;
          if (oldPriceElement) {
            oldPriceElement.style.display = 'none';
          }
        }
      }
    },
    async productAddToCart(formId, progressElement) {
      try {
        const form = document.getElementById(formId);
        const formData = new FormData(form);
        console.log('Adding to cart:', {
          formId,
          productId: formData.get('product_id'),
          quantity: formData.get('quantity')
        });

        const response = await zid.store.cart.addProduct({ 
          formId: formId
        });

        console.log('Cart response:', response);

        if (response.status === 'success') {
          if (typeof setCartBadge === 'function') {
            setCartBadge(response.data.cart.products_count);
          }
          if (typeof updateMiniCart === 'function') {
            updateMiniCart();
          }
        } else {
          console.error('Add to cart failed:', response);
          const errorMessage = getCurrentLanguage() === 'ar' 
            ? response.data?.message || 'فشل إضافة المنتج إلى السلة'
            : response.data?.message || 'Failed to add product to cart';
          alert(errorMessage);
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        const errorMessage = getCurrentLanguage() === 'ar' 
          ? 'حدث خطأ أثناء إضافة المنتج إلى السلة'
          : 'Error occurred while adding product to cart';
        alert(errorMessage);
      } finally {
        if (progressElement) {
          progressElement.classList.add('d-none');
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

      // Handle custom close events (e.g., from navigation)
      document.addEventListener('routeChange', () => {
        if (this.currentModal) {
          this.closeModal();
        }
      });

      // Close modal on back button press
      window.addEventListener('popstate', () => {
        if (this.currentModal) {
          this.closeModal();
        }
      });

      // Add keyframe animation for spinner
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .add-to-cart-progress {
          animation: spin 1s linear infinite;
        }

        .hmstudio-upsell-modal {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                       Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 
                       'Helvetica Neue', sans-serif;
        }

        .hmstudio-upsell-modal input[type="number"]::-webkit-inner-spin-button,
        .hmstudio-upsell-modal input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .hmstudio-upsell-modal input[type="number"] {
          -moz-appearance: textfield;
        }

        .variant-select {
          direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
        }

        .product-price {
          display: inline-block;
          direction: ltr;
        }

        .product-old-price {
          display: inline-block;
          direction: ltr;
        }
      `;
      document.head.appendChild(styleSheet);

      // Add RTL stylesheet if needed
      if (getCurrentLanguage() === 'ar') {
        const rtlStyles = document.createElement('style');
        rtlStyles.textContent = `
          .hmstudio-upsell-modal {
            direction: rtl;
          }
          
          .hmstudio-upsell-modal .add-to-cart-progress {
            margin-right: 8px;
            margin-left: 0;
          }

          .hmstudio-upsell-modal .variant-select {
            text-align: right;
          }
        `;
        document.head.appendChild(rtlStyles);
      }

      // Handle Zid product variants script
      window.productOptionsChanged = (selected_product) => {
        if (selected_product) {
          const form = document.querySelector('#product-form');
          if (form) {
            const productIdInput = form.querySelector('#product-id');
            if (productIdInput) {
              productIdInput.value = selected_product.id;
            }

            const addButton = form.querySelector('.btn-primary');
            if (addButton) {
              if (!selected_product.unavailable) {
                addButton.disabled = false;
                addButton.style.opacity = '1';
              } else {
                addButton.disabled = true;
                addButton.style.opacity = '0.5';
              }
            }
          }
        }
      };

      // Set up mutation observer to handle dynamic content changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && this.currentModal) {
            const modalStillExists = document.contains(this.currentModal);
            if (!modalStillExists) {
              this.currentModal = null;
            }
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
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
