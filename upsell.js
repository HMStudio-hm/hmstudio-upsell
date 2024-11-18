// src/scripts/upsell.js v1.2.6
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
    
    if (!campaignsData) {
      console.log('No campaigns data found in URL');
      return [];
    }

    try {
      const decodedData = atob(campaignsData);
      const parsedData = JSON.parse(decodedData);
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

    // New function to fetch full product data including variants
    async fetchProductData(productId) {
      if (!storeId || !productId) {
        console.error('Store ID or Product ID missing');
        return null;
      }

      try {
        const response = await fetch(`https://europe-west3-hmstudio-85f42.cloudfunctions.net/getProductData?storeId=${storeId}&productId=${productId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch product data: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Received product data:', data);
        return data;
      } catch (error) {
        console.error('Error fetching product data:', error);
        return null;
      }
    },

    createVariantsSection(product, currentLang) {
      const variantsContainer = document.createElement('div');
      variantsContainer.className = 'hmstudio-upsell-variants';
      variantsContainer.style.cssText = `
        margin-top: 15px;
        padding: 10px 0;
      `;

      if (product.variants && product.variants.length > 0) {
        // Get unique variants and their values
        const variantAttributes = new Map();
        
        product.variants.forEach(variant => {
          if (variant.attributes && variant.attributes.length > 0) {
            variant.attributes.forEach(attr => {
              if (!variantAttributes.has(attr.name)) {
                variantAttributes.set(attr.name, {
                  name: attr.name,
                  slug: attr.slug,
                  values: new Set()
                });
              }
              variantAttributes.get(attr.name).values.add(attr.value[currentLang]);
            });
          }
        });

        // Create dropdowns for each attribute type
        variantAttributes.forEach((attr) => {
          const select = document.createElement('select');
          select.className = 'variant-select';
          select.style.cssText = `
            margin: 5px 0;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 100%;
          `;

          const labelText = currentLang === 'ar' ? attr.slug : attr.name;
          
          const label = document.createElement('label');
          label.textContent = labelText;
          label.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          `;

          const placeholderText = currentLang === 'ar' ? `اختر ${labelText}` : `Select ${labelText}`;
          
          let optionsHTML = `<option value="">${placeholderText}</option>`;
          
          Array.from(attr.values).forEach(value => {
            optionsHTML += `<option value="${value}">${value}</option>`;
          });
          
          select.innerHTML = optionsHTML;

          select.addEventListener('change', () => {
            console.log('Selected:', attr.name, select.value);
            this.updateSelectedVariant(product, select.closest('form'));
          });

          variantsContainer.appendChild(label);
          variantsContainer.appendChild(select);
        });
      }

      return variantsContainer;
    },

    updateSelectedVariant(product, form) {
      if (!form) {
        console.error('Product form not found');
        return;
      }

      const currentLang = getCurrentLanguage();
      const selectedValues = {};

      // Get all selected values
      form.querySelectorAll('.variant-select').forEach(select => {
        if (select.value) {
          const labelText = select.previousElementSibling.textContent;
          selectedValues[labelText] = select.value;
        }
      });

      console.log('Selected values:', selectedValues);

      // Find matching variant
      const selectedVariant = product.variants.find(variant => {
        return variant.attributes.every(attr => {
          const attrLabel = currentLang === 'ar' ? attr.slug : attr.name;
          return selectedValues[attrLabel] === attr.value[currentLang];
        });
      });

      console.log('Found variant:', selectedVariant);

      if (selectedVariant) {
        // Update product ID input
        const productIdInput = form.querySelector('input[name="product_id"]');
        if (productIdInput) {
          productIdInput.value = selectedVariant.id;
          console.log('Updated product ID to:', selectedVariant.id);
        }

        // Update price display
        const priceElement = form.querySelector('.product-price');
        const oldPriceElement = form.querySelector('.product-old-price');
        
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

        // Update add to cart button
        const addToCartBtn = form.querySelector('.hmstudio-upsell-add-to-cart');
        if (addToCartBtn) {
          if (!selectedVariant.unavailable) {
            addToCartBtn.disabled = false;
            addToCartBtn.style.opacity = '1';
            addToCartBtn.style.cursor = 'pointer';
          } else {
            addToCartBtn.disabled = true;
            addToCartBtn.style.opacity = '0.5';
            addToCartBtn.style.cursor = 'not-allowed';
          }
        }
      }
    },

    async createProductCard(product) {
      const currentLang = getCurrentLanguage();
      const isRTL = currentLang === 'ar';

      // Fetch full product data including variants
      const fullProductData = await this.fetchProductData(product.id);
      if (!fullProductData) {
        console.error('Failed to fetch full product data');
        return null;
      }

      // Get the correct product name
      let productName = fullProductData.name;
      if (typeof productName === 'object') {
        productName = currentLang === 'ar' ? productName.ar : productName.en;
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

      // Create form
      const form = document.createElement('form');
      form.id = `product-form-${fullProductData.id}`;
      
      // Product ID input
      const productIdInput = document.createElement('input');
      productIdInput.type = 'hidden';
      productIdInput.name = 'product_id';
      productIdInput.value = fullProductData.selected_product?.id || fullProductData.id;
      form.appendChild(productIdInput);

      // Quantity input
      const quantityInput = document.createElement('input');
      quantityInput.type = 'hidden';
      quantityInput.name = 'quantity';
      quantityInput.value = '1';
      form.appendChild(quantityInput);

      // Product Image and Title
      const productContent = document.createElement('div');
      productContent.innerHTML = `
        <img 
          src="${fullProductData.images?.[0]?.url || product.thumbnail}" 
          alt="${productName}" 
          style="width: 100%; height: 150px; object-fit: contain; margin-bottom: 10px;"
        >
        <h4 style="font-size: 1em; margin: 10px 0; min-height: 40px;">
          ${productName}
        </h4>
      `;
      card.appendChild(productContent);

      // Add variants section if product has options
      if (fullProductData.has_options) {
        const variantsSection = this.createVariantsSection(fullProductData, currentLang);
        card.appendChild(variantsSection);
      }

      // Price display
      const priceContainer = document.createElement('div');
      priceContainer.style.cssText = `
        margin: 15px 0;
        font-weight: bold;
      `;
      
      const currentPrice = document.createElement('span');
      currentPrice.className = 'product-price';
      currentPrice.style.color = 'var(--theme-primary, #00b286)';
      
      const oldPrice = document.createElement('span');
      oldPrice.className = 'product-old-price';
      oldPrice.style.cssText = `
        text-decoration: line-through;
        color: #999;
        margin-${isRTL ? 'right' : 'left'}: 10px;
        display: none;
      `;

      if (fullProductData.formatted_sale_price) {
        currentPrice.textContent = fullProductData.formatted_sale_price;
        oldPrice.textContent = fullProductData.formatted_price;
        oldPrice.style.display = 'inline';
      } else {
        currentPrice.textContent = fullProductData.formatted_price;
      }

      priceContainer.appendChild(currentPrice);
      priceContainer.appendChild(oldPrice);
      card.appendChild(priceContainer);

      // Add to cart button
      const addButton = document.createElement('button');
      addButton.className = 'hmstudio-upsell-add-to-cart';
      addButton.type = 'button';
      addButton.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
      addButton.style.cssText = `
        background: var(--theme-primary, #00b286);
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        transition: opacity 0.2s;
      `;

      // Add to cart handler
      addButton.addEventListener('click', async () => {
        try {
          addButton.disabled = true;
          const formData = new FormData(form);
          
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
            const errorMessage = currentLang === 'ar' 
              ? response.data.message || 'فشل إضافة المنتج إلى السلة'
              : response.data.message || 'Failed to add product to cart';
            alert(errorMessage);
          }
        } catch (error) {
          console.error('Error adding to cart:', error);
          const errorMessage = currentLang === 'ar' 
            ? 'حدث خطأ أثناء إضافة المنتج إلى السلة'
            : 'Error occurred while adding product to cart';
          alert(errorMessage);
        } finally {
          addButton.disabled = false;
        }
      });

      card.appendChild(form);
      card.appendChild(addButton);

      return card;
    },

    async showUpsellModal(campaign, productCart) {
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

        // Create and add product cards
        const productCards = await Promise.all(
          campaign.upsellProducts.map(product => this.createProductCard(product))
        );

        productCards.forEach(card => {
          if (card) {
            productsGrid.appendChild(card);
          }
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

    closeModal() {
      if (this.currentModal) {
        this.currentModal.style.opacity = '0';
        const content = this.currentModal.querySelector('.hmstudio-upsell-content');
        if (content) {
          content.style.transform = 'translateY(20px)';
        }
        setTimeout(() => {
          if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
          }
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

      // Clean up on page unload
      window.addEventListener('beforeunload', () => {
        if (this.currentModal) {
          this.closeModal();
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
