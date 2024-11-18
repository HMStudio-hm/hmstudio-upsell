// src/scripts/upsell.js v1.2.2
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

        // Subtitle with trigger product name
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
       // Products grid
        const productsGrid = document.createElement('div');
        productsGrid.style.cssText = `
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 20px;
        `;

        // Add upsell products directly without fetching
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

        // Load products and show modal with animation
        loadProducts().then(() => {
          requestAnimationFrame(() => {
            modal.style.opacity = '1';
            content.style.transform = 'translateY(0)';
          });
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

      // Create main card container
      const card = document.createElement('div');
      card.className = 'hmstudio-upsell-product-card';
      card.style.cssText = `
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 15px;
        text-align: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      `;

      // Create form with proper structure for Zid's theme library
      const form = document.createElement('form');
      form.id = uniqueId;
      form.className = 'product-form';

      // Product ID input with specific ID as required by Zid
      const productIdInput = document.createElement('input');
      productIdInput.type = 'hidden';
      productIdInput.id = 'product-id';
      productIdInput.name = 'product_id';
      productIdInput.value = product.selected_product ? product.selected_product.id : product.id;
      form.appendChild(productIdInput);

      // Hidden quantity input with specific ID as required by Zid
      const quantityInput = document.createElement('input');
      quantityInput.type = 'hidden';
      quantityInput.id = 'product-quantity';
      quantityInput.name = 'quantity';
      quantityInput.value = '1';
      form.appendChild(quantityInput);

      // Product content
      const contentContainer = document.createElement('div');
      contentContainer.innerHTML = `
        <img 
          src="${product.thumbnail}" 
          alt="${productName}" 
          style="width: 100%; height: 150px; object-fit: contain; margin-bottom: 10px;"
        >
        <h4 style="font-size: 1em; margin: 10px 0; min-height: 40px;">
          ${productName}
        </h4>
      `;
      card.appendChild(contentContainer);

      // Price container with required IDs for Zid's variant system
      const priceContainer = document.createElement('div');
      priceContainer.style.cssText = 'margin: 10px 0; text-align: center;';
      
      const regularPrice = document.createElement('span');
      regularPrice.id = `${uniqueId}-price`;
      regularPrice.className = 'product-price';
      regularPrice.style.cssText = 'font-weight: bold; color: var(--theme-primary, #00b286); direction: ltr; display: inline-block;';

      const oldPrice = document.createElement('span');
      oldPrice.id = `${uniqueId}-old-price`;
      oldPrice.style.cssText = 'text-decoration: line-through; margin-left: 8px; color: #999; display: none; direction: ltr;';

      priceContainer.appendChild(regularPrice);
      priceContainer.appendChild(oldPrice);
      card.appendChild(priceContainer);

      // Handle variants using Zid's template system
      if (product.variants && product.variants.length > 0) {
        console.log('Product has variants:', product.variants);
        
        const variantsContainer = document.createElement('div');
        variantsContainer.className = 'variants-container';
        variantsContainer.style.cssText = 'margin: 15px 0;';

        // Get unique attributes from variants
        const attributes = {};
        product.variants.forEach(variant => {
          if (variant.attributes) {
            variant.attributes.forEach(attr => {
              if (!attributes[attr.name]) {
                attributes[attr.name] = new Set();
              }
              attributes[attr.name].add(JSON.stringify({
                value: attr.value,
                label: attr.value,
                attribute: attr.name
              }));
            });
          }
        });

        // Create dropdowns for each attribute
        Object.entries(attributes).forEach(([attrName, valuesSet]) => {
          const values = Array.from(valuesSet).map(v => JSON.parse(v));
          
          const selectContainer = document.createElement('div');
          selectContainer.style.cssText = 'margin-bottom: 10px;';

          const label = document.createElement('label');
          label.textContent = attrName;
          label.style.cssText = 'display: block; margin-bottom: 5px; font-size: 0.9em; color: #666;';

          const select = document.createElement('select');
          select.className = 'variant-select';
          select.name = `variant-${attrName.toLowerCase().replace(/\s+/g, '-')}`;
          select.setAttribute('data-attribute', attrName);
          select.style.cssText = `
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 5px;
            ${isRTL ? 'direction: rtl;' : ''}
          `;

          // Default option
          const defaultOption = document.createElement('option');
          defaultOption.value = '';
          defaultOption.textContent = currentLang === 'ar' 
            ? `اختر ${attrName}`
            : `Select ${attrName}`;
          select.appendChild(defaultOption);

          // Add variant options
          values.forEach(value => {
            const option = document.createElement('option');
            option.value = value.value;
            option.textContent = value.label;
            select.appendChild(option);
          });

          selectContainer.appendChild(label);
          selectContainer.appendChild(select);
          variantsContainer.appendChild(selectContainer);

          // Handle variant selection
          select.addEventListener('change', () => {
            const selections = {};
            variantsContainer.querySelectorAll('select').forEach(sel => {
              const attribute = sel.getAttribute('data-attribute');
              selections[attribute] = sel.value;
            });

            // Find matching variant
            const matchingVariant = product.variants.find(variant => 
              variant.attributes &&
              variant.attributes.every(attr => 
                selections[attr.name] === attr.value
              )
            );

            if (matchingVariant) {
              productIdInput.value = matchingVariant.id;
              this.updatePriceDisplay(matchingVariant, uniqueId);
              this.updateAddToCartButton(matchingVariant, form);
            }
          });
        });

        card.appendChild(variantsContainer);
      }

      // Add form to card
      card.appendChild(form);

      // Quantity selector container and controls
      const quantityContainer = document.createElement('div');
      quantityContainer.style.cssText = `
        margin: 15px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      `;
      // Continuing from the quantity container...

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

      // Visible quantity input
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

      visibleQuantityInput.addEventListener('change', () => {
        let value = parseInt(visibleQuantityInput.value);
        if (isNaN(value) || value < 1) value = 1;
        if (value > 10) value = 10;
        visibleQuantityInput.value = value;
        quantityInput.value = value;
      });

      // Assemble quantity controls
      quantityWrapper.appendChild(decreaseBtn);
      quantityWrapper.appendChild(visibleQuantityInput);
      quantityWrapper.appendChild(increaseBtn);
      quantityContainer.appendChild(quantityLabel);
      quantityContainer.appendChild(quantityWrapper);
      card.appendChild(quantityContainer);

      // Add to cart button and loading spinner
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'position: relative;';

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'btn btn-primary add-to-cart-btn';
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

      const spinner = document.createElement('img');
      spinner.className = 'add-to-cart-progress d-none';
      spinner.src = '/path/to/spinner.gif'; // Update with actual spinner path
      spinner.style.cssText = `
        width: 20px;
        height: 20px;
        margin-left: 8px;
        display: none;
      `;
      addButton.appendChild(spinner);

      buttonContainer.appendChild(addButton);
      card.appendChild(buttonContainer);

      // Add to cart functionality
      addButton.addEventListener('click', () => {
        console.log('Add to cart clicked for form:', uniqueId);
        this.productAddToCart(uniqueId);
      });

      // Set initial price
      if (product.selected_product) {
        this.updatePriceDisplay(product.selected_product, uniqueId);
      } else {
        regularPrice.textContent = product.formatted_price;
      }

      // Add hover effects
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

    updateAddToCartButton(variant, form) {
      const button = form.querySelector('.add-to-cart-btn');
      if (button) {
        if (variant.unavailable) {
          button.disabled = true;
          button.style.opacity = '0.5';
          const textSpan = button.querySelector('span');
          if (textSpan) {
            textSpan.textContent = getCurrentLanguage() === 'ar' ? 'غير متوفر' : 'Unavailable';
          }
        } else {
          button.disabled = false;
          button.style.opacity = '1';
          const textSpan = button.querySelector('span');
          if (textSpan) {
            textSpan.textContent = getCurrentLanguage() === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
          }
        }
      }
    },

    productAddToCart(formId) {
      const form = document.getElementById(formId);
      if (!form) {
        console.error('Form not found:', formId);
        return;
      }

      const progress = form.querySelector('.add-to-cart-progress');
      if (progress) {
        progress.style.display = 'inline-block';
      }

      zid.store.cart.addProduct({ formId })
        .then((response) => {
          console.log('Add to cart response:', response);
          if (response.status === 'success') {
            if (typeof setCartBadge === 'function') {
              setCartBadge(response.data.cart.products_count);
            }
            if (typeof updateMiniCart === 'function') {
              updateMiniCart();
            }
          } else {
            const errorMessage = getCurrentLanguage() === 'ar' 
              ? response.data?.message || 'فشل إضافة المنتج إلى السلة'
              : response.data?.message || 'Failed to add product to cart';
            alert(errorMessage);
          }
        })
        .catch((error) => {
          console.error('Error adding to cart:', error);
          const errorMessage = getCurrentLanguage() === 'ar' 
            ? 'حدث خطأ أثناء إضافة المنتج إلى السلة'
            : 'Error occurred while adding product to cart';
          alert(errorMessage);
        })
        .finally(() => {
          if (progress) {
            progress.style.display = 'none';
          }
        });
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

      // Add window-level function for variant changes
      window.productOptionsChanged = function(selected_product) {
        console.log('Product options changed:', selected_product);
        if (selected_product) {
          const formId = document.querySelector('.product-form')?.id;
          if (!formId) return;

          const form = document.getElementById(formId);
          if (!form) return;

          // Update product ID
          const productIdInput = form.querySelector('#product-id');
          if (productIdInput) {
            productIdInput.value = selected_product.id;
          }

          // Update price display
          const priceDisplay = document.getElementById(`${formId}-price`);
          const oldPriceDisplay = document.getElementById(`${formId}-old-price`);

          if (priceDisplay) {
            if (selected_product.formatted_sale_price) {
              priceDisplay.textContent = selected_product.formatted_sale_price;
              if (oldPriceDisplay) {
                oldPriceDisplay.textContent = selected_product.formatted_price;
                oldPriceDisplay.style.display = 'inline';
              }
            } else {
              priceDisplay.textContent = selected_product.formatted_price;
              if (oldPriceDisplay) {
                oldPriceDisplay.style.display = 'none';
              }
            }
          }

          // Update add to cart button state
          const addButton = form.querySelector('.add-to-cart-btn');
          if (addButton) {
            if (selected_product.unavailable) {
              addButton.disabled = true;
              addButton.style.opacity = '0.5';
              const buttonText = addButton.querySelector('span');
              if (buttonText) {
                buttonText.textContent = getCurrentLanguage() === 'ar' ? 'غير متوفر' : 'Unavailable';
              }
            } else {
              addButton.disabled = false;
              addButton.style.opacity = '1';
              const buttonText = addButton.querySelector('span');
              if (buttonText) {
                buttonText.textContent = getCurrentLanguage() === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
              }
            }
          }
        }
      };

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

        .hmstudio-upsell-modal select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='currentColor' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 24px;
        }

        .hmstudio-upsell-modal[dir="rtl"] select {
          background-position: left 8px center;
          padding-right: 8px;
          padding-left: 24px;
        }

        .add-to-cart-btn:disabled {
          cursor: not-allowed;
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
