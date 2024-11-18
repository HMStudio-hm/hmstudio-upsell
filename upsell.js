// src/scripts/upsell.js v1.2.5
// HMStudio Upsell Feature with Zid Variant Support

(function() {
  console.log('Upsell script initialized');

  function getStoreIdFromUrl() {
    const scriptTag = document.currentScript;
    const scriptUrl = new URL(scriptTag.src);
    const storeId = scriptUrl.searchParams.get('storeId');
    return storeId ? storeId.split('?')[0] : null;
  }

  function getCurrentLanguage() {
    return document.documentElement.lang || 'ar';
  }

  function getCampaignsFromUrl() {
    const scriptTag = document.currentScript;
    const scriptUrl = new URL(scriptTag.src);
    const campaignsData = scriptUrl.searchParams.get('campaigns');
    
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

        const productsGrid = document.createElement('div');
        productsGrid.style.cssText = `
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        `;

        campaign.upsellProducts.forEach(product => {
          const productCard = this.createProductCard(product);
          productsGrid.appendChild(productCard);
        });

        content.appendChild(closeButton);
        content.appendChild(title);
        content.appendChild(subtitle);
        content.appendChild(productsGrid);
        modal.appendChild(content);
        document.body.appendChild(modal);

        requestAnimationFrame(() => {
          modal.style.opacity = '1';
          content.style.transform = 'translateY(0)';
        });

        this.currentModal = modal;

        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeModal();
          }
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            this.closeModal();
          }
        });
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

      // Create form for add to cart
      const form = document.createElement('form');
      form.id = `product-form-${product.id}`;

      // Product ID input
      const productIdInput = document.createElement('input');
      productIdInput.type = 'hidden';
      productIdInput.id = 'product-id';
      productIdInput.name = 'product_id';
      productIdInput.value = product.selected_product?.id || product.id;
      form.appendChild(productIdInput);

      // Quantity input
      const quantityInput = document.createElement('input');
      quantityInput.type = 'hidden';
      quantityInput.id = 'product-quantity';
      quantityInput.name = 'quantity';
      quantityInput.value = '1';
      form.appendChild(quantityInput);

      // Product image and name
      const productInfo = document.createElement('div');
      productInfo.innerHTML = `
        <img 
          src="${product.thumbnail}" 
          alt="${product.name[currentLang] || product.name}" 
          style="width: 100%; height: 150px; object-fit: contain; margin-bottom: 10px;"
        >
        <h4 style="font-size: 1em; margin: 10px 0; min-height: 40px;">
          ${product.name[currentLang] || product.name}
        </h4>
      `;
      form.appendChild(productInfo);

      // Handle variants if they exist
      if (product.variants && product.variants.length > 0) {
        const variantsContainer = document.createElement('div');
        variantsContainer.className = 'variants-container';
        variantsContainer.style.cssText = `
          margin: 15px 0;
          text-align: ${isRTL ? 'right' : 'left'};
        `;

        // Initialize temporary variant dropdowns (will be replaced by Zid's template)
        const tempVariantsDiv = document.createElement('div');
        tempVariantsDiv.innerHTML = '{{template_for_product_variants_dropdown}}';
        variantsContainer.appendChild(tempVariantsDiv);

        // Add product view scripts for variant handling
        const scriptsDiv = document.createElement('div');
        scriptsDiv.innerHTML = '{{product_view_scripts}}';
        variantsContainer.appendChild(scriptsDiv);

        form.appendChild(variantsContainer);
      }

      // Price display
      const priceDisplay = document.createElement('div');
      priceDisplay.style.cssText = `
        margin: 15px 0;
        font-size: 1.2em;
        font-weight: bold;
        color: var(--theme-primary, #00b286);
      `;

      if (product.formatted_sale_price) {
        priceDisplay.innerHTML = `
          <span id="product-price">${product.formatted_sale_price}</span>
          <span id="product-old-price" style="text-decoration: line-through; color: #999; margin-${isRTL ? 'right' : 'left'}: 10px;">
            ${product.formatted_price}
          </span>
        `;
      } else {
        priceDisplay.innerHTML = `
          <span id="product-price">${product.formatted_price}</span>
        `;
      }
      form.appendChild(priceDisplay);

      // Quantity selector
      const quantityContainer = document.createElement('div');
      quantityContainer.style.cssText = `
        margin: 15px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      `;

      const quantityLabel = document.createElement('label');
      quantityLabel.textContent = currentLang === 'ar' ? 'الكمية:' : 'Quantity:';
      quantityLabel.style.cssText = `
        font-size: 0.9em;
        color: #666;
      `;

      const quantityWrapper = document.createElement('div');
      quantityWrapper.style.cssText = `
        display: flex;
        align-items: center;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: hidden;
      `;

      const decreaseBtn = document.createElement('button');
      decreaseBtn.type = 'button';
      decreaseBtn.textContent = '-';
      decreaseBtn.style.cssText = `
        width: 28px;
        height: 28px;
        border: none;
        background: #f5f5f5;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.min = '1';
      qtyInput.max = '10';
      qtyInput.value = '1';
      qtyInput.style.cssText = `
        width: 40px;
        height: 28px;
        border: none;
        border-left: 1px solid #ddd;
        border-right: 1px solid #ddd;
        text-align: center;
        -moz-appearance: textfield;
      `;

      qtyInput.addEventListener('change', () => {
        let value = parseInt(qtyInput.value);
        if (isNaN(value) || value < 1) value = 1;
        if (value > 10) value = 10;
        qtyInput.value = value;
        quantityInput.value = value;
      });

      const increaseBtn = document.createElement('button');
      increaseBtn.type = 'button';
      increaseBtn.textContent = '+';
      increaseBtn.style.cssText = decreaseBtn.style.cssText;

      decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(qtyInput.value);
        if (currentValue > 1) {
          qtyInput.value = currentValue - 1;
          quantityInput.value = currentValue - 1;
        }
      });

      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(qtyInput.value);
        if (currentValue < 10) {
          qtyInput.value = currentValue + 1;
          quantityInput.value = currentValue + 1;
        }
      });

      quantityWrapper.appendChild(decreaseBtn);
      quantityWrapper.appendChild(qtyInput);
      quantityWrapper.appendChild(increaseBtn);
      quantityContainer.appendChild(quantityLabel);
      quantityContainer.appendChild(quantityWrapper);
      form.appendChild(quantityContainer);

      // Add to cart button
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'btn btn-add-to-cart';
      addButton.style.cssText = `
        background: var(--theme-primary, #00b286);
        color: white;
        border: none;
        padding: 10px;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        font-weight: 500;
        transition: opacity 0.2s;
      `;
      addButton.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';

      // Add loading spinner
      const loadingSpinner = document.createElement('img');
      loadingSpinner.className = 'add-to-cart-progress d-none';
      loadingSpinner.style.cssText = `
        margin-left: 8px;
        width: 20px;
        height: 20px;
      `;

      addButton.appendChild(loadingSpinner);
      form.appendChild(addButton);

      // Add to cart functionality
      addButton.addEventListener('click', () => {
        loadingSpinner.classList.remove('d-none');
        
        zid.store.cart.addProduct({ formId: form.id })
          .then((response) => {
            console.log('Add to cart response:', response);
            if (response.status === 'success') {
              if (typeof setCartBadge === 'function') {
                setCartBadge(response.data.cart.products_count);
              }
              this.closeModal();
            } else {
              const errorMessage = currentLang === 'ar' 
                ? response.data.message || 'فشل إضافة المنتج إلى السلة'
                : response.data.message || 'Failed to add product to cart';
              alert(errorMessage);
            }
          })
          .catch((error) => {
            console.error('Error adding to cart:', error);
            const errorMessage = currentLang === 'ar' 
              ? 'حدث خطأ أثناء إضافة المنتج إلى السلة'
              : 'Error occurred while adding product to cart';
            alert(errorMessage);
          })
          .finally(() => {
            loadingSpinner.classList.add('d-none');
          });
      });

      card.appendChild(form);

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

      // Setup product options change handler if not already defined
      if (typeof window.productOptionsChanged === 'undefined') {
        window.productOptionsChanged = function(selected_product) {
          if (!selected_product) return;

          const productId = selected_product.id;
          const form = document.querySelector(`#product-form-${productId}`);
          if (!form) return;

          // Update the hidden product ID input
          const productIdInput = form.querySelector('#product-id');
          if (productIdInput) {
            productIdInput.value = selected_product.id;
          }

          // Update the price display
          const priceElement = form.querySelector('#product-price');
          const oldPriceElement = form.querySelector('#product-old-price');

          if (selected_product.formatted_sale_price) {
            if (priceElement) priceElement.textContent = selected_product.formatted_sale_price;
            if (oldPriceElement) {
              oldPriceElement.textContent = selected_product.formatted_price;
              oldPriceElement.style.display = 'inline';
            }
          } else {
            if (priceElement) priceElement.textContent = selected_product.formatted_price;
            if (oldPriceElement) oldPriceElement.style.display = 'none';
          }

          // Update add to cart button state
          const addButton = form.querySelector('.btn-add-to-cart');
          if (addButton) {
            if (!selected_product.unavailable) {
              addButton.disabled = false;
              addButton.style.opacity = '1';
              addButton.style.cursor = 'pointer';
            } else {
              addButton.disabled = true;
              addButton.style.opacity = '0.5';
              addButton.style.cursor = 'not-allowed';
            }
          }
        };
      }
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
