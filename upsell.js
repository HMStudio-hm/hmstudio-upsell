// src/scripts/upsell.js v2.1.2
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
      
      return parsedData.map(campaign => ({
        ...campaign,
        textSettings: {
          titleAr: campaign.textSettings?.titleAr || '',
          titleEn: campaign.textSettings?.titleEn || '',
          subtitleAr: campaign.textSettings?.subtitleAr || '',
          subtitleEn: campaign.textSettings?.subtitleEn || ''
        }
      }));
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

    async fetchProductData(productId) {
      console.log('Fetching product data for ID:', productId);
      const url = `https://europe-west3-hmstudio-85f42.cloudfunctions.net/getProductData?storeId=${storeId}&productId=${productId}`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch product data: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Received product data:', data);
        return data;
      } catch (error) {
        console.error('Error fetching product data:', error);
        throw error;
      }
    },

    async createProductCard(product) {
      try {
        const fullProductData = await this.fetchProductData(product.id);
        console.log('Full product data:', fullProductData);

        if (!fullProductData) {
          throw new Error('Failed to fetch full product data');
        }

        const currentLang = getCurrentLanguage();
        const isRTL = currentLang === 'ar';

        let productName = fullProductData.name;
        if (typeof productName === 'object') {
          productName = currentLang === 'ar' ? productName.ar : productName.en;
        }

        const card = document.createElement('div');
        card.className = 'hmstudio-upsell-product-card';

        // Create form with proper structure for Zid API
        const form = document.createElement('form');
        form.id = `product-form-${fullProductData.id}`;

        // Product ID input
        const productIdInput = document.createElement('input');
        productIdInput.type = 'hidden';
        productIdInput.id = 'product-id';
        productIdInput.name = 'product_id';
        productIdInput.value = fullProductData.selected_product?.id || fullProductData.id;
        form.appendChild(productIdInput);

        // Product content
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
        if (fullProductData.has_options && fullProductData.variants?.length > 0) {
          const variantsSection = this.createVariantsSection(fullProductData, currentLang);
          form.appendChild(variantsSection);

          // Initialize with default variant
          if (fullProductData.selected_product) {
            this.updateSelectedVariant(fullProductData, form);
          }
        }

        // Quantity selector
        const quantityWrapper = document.createElement('div');
        quantityWrapper.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 15px 0;
        `;

        const quantityLabel = document.createElement('label');
        quantityLabel.textContent = currentLang === 'ar' ? 'الكمية:' : 'Quantity:';
        quantityLabel.style.cssText = `
          font-size: 14px;
          color: #666;
        `;

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.id = 'product-quantity';
        quantityInput.name = 'quantity';
        quantityInput.min = '1';
        quantityInput.value = '1';
        quantityInput.style.cssText = `
          width: 60px;
          padding: 5px;
          border: 1px solid #ddd;
          border-radius: 4px;
          text-align: center;
        `;

        quantityWrapper.appendChild(quantityLabel);
        quantityWrapper.appendChild(quantityInput);
        form.appendChild(quantityWrapper);

        // Price display
        const priceContainer = document.createElement('div');
        priceContainer.style.cssText = `margin: 15px 0; font-weight: bold;`;

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

        const currencySymbol = currentLang === 'ar' ? 'ر.س' : 'SAR';

        if (fullProductData.formatted_sale_price) {
          currentPrice.textContent = fullProductData.formatted_sale_price.replace('SAR', currencySymbol);
          oldPrice.textContent = fullProductData.formatted_price.replace('SAR', currencySymbol);
          oldPrice.style.display = 'inline';
        } else {
          currentPrice.textContent = fullProductData.formatted_price.replace('SAR', currencySymbol);
        }

        priceContainer.appendChild(currentPrice);
        priceContainer.appendChild(oldPrice);
        card.appendChild(priceContainer);

        // Add to cart button
        const addButton = document.createElement('button');
        addButton.className = 'btn btn-primary add-to-cart-btn';
        addButton.type = 'button';
        addButton.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
        addButton.style.cssText = `
          background: var(--theme-primary, #007bff);
          color: white;
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.3s;
        `;

        const spinner = document.createElement('div');
        spinner.className = 'add-to-cart-progress d-none';
        spinner.style.cssText = `
          width: 20px;
          height: 20px;
          border: 2px solid #ffffff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        `;
        addButton.appendChild(spinner);

        // Add to cart handler
        addButton.addEventListener('click', function() {
          if (fullProductData.has_options && fullProductData.variants?.length > 0) {
            const selectedVariants = {};
            const missingSelections = [];
            
            form.querySelectorAll('.variant-select').forEach(select => {
              const labelText = select.previousElementSibling.textContent;
              if (!select.value) {
                missingSelections.push(labelText);
              }
              selectedVariants[labelText] = select.value;
            });

            if (missingSelections.length > 0) {
              const message = currentLang === 'ar' 
                ? `الرجاء اختيار ${missingSelections.join(', ')}`
                : `Please select ${missingSelections.join(', ')}`;
              alert(message);
              return;
            }
          }

          const spinners = form.querySelectorAll('.add-to-cart-progress');
          spinners.forEach(s => s.classList.remove('d-none'));

          zid.store.cart.addProduct({ 
            formId: form.id
          }).then(function(response) {
            console.log('Add to cart response:', response);
            if(response.status === 'success') {
              if (typeof setCartBadge === 'function') {
                setCartBadge(response.data.cart.products_count);
              }
            }
            spinners.forEach(s => s.classList.add('d-none'));
          }).catch(function(error) {
            console.error('Add to cart error:', error);
            spinners.forEach(s => s.classList.add('d-none'));
          });
        });

        card.appendChild(form);
        card.appendChild(addButton);

        return card;
      } catch (error) {
        console.error('Error creating product card:', error);
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

      form.querySelectorAll('.variant-select').forEach(select => {
        if (select.value) {
          const labelText = select.previousElementSibling.textContent;
          selectedValues[labelText] = select.value;
        }
      });

      console.log('Selected values:', selectedValues);

      const selectedVariant = product.variants.find(variant => {
        return variant.attributes.every(attr => {
          const attrLabel = currentLang === 'ar' ? attr.slug : attr.name;
          return selectedValues[attrLabel] === attr.value[currentLang];
        });
      });

      console.log('Found variant:', selectedVariant);

      if (selectedVariant) {
        const productIdInput = form.querySelector('#product-id');
        if (productIdInput) {
          productIdInput.value = selectedVariant.id;
          console.log('Updated product ID to:', selectedVariant.id);
        }

        const priceElement = form.querySelector('.product-price');
        const oldPriceElement = form.querySelector('.product-old-price');
        const currencySymbol = currentLang === 'ar' ? 'ر.س' : 'SAR';

        if (priceElement) {
          if (selectedVariant.formatted_sale_price) {
            priceElement.textContent = selectedVariant.formatted_sale_price.replace('SAR', currencySymbol);
            if (oldPriceElement) {
              oldPriceElement.textContent = selectedVariant.formatted_price.replace('SAR', currencySymbol);
              oldPriceElement.style.display = 'inline';
            }
          } else {
            priceElement.textContent = selectedVariant.formatted_price.replace('SAR', currencySymbol);
            if (oldPriceElement) {
              oldPriceElement.style.display = 'none';
            }
          }
        }

        const addToCartBtn = form.parentElement.querySelector('.add-to-cart-btn');
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

    async showUpsellModal(campaign, productCart) {
      console.log('Showing upsell modal:', { campaign, productCart });
      
      if (!campaign?.upsellProducts?.length) {
        console.warn('Invalid campaign data:', campaign);
        return;
      }

      const currentLang = getCurrentLanguage();
      const isRTL = currentLang === 'ar';

      try {
        if (this.currentModal) {
          this.currentModal.remove();
        }

        // Create style tag for responsive design
        const styleTag = document.createElement('style');
        styleTag.textContent = `
          .hmstudio-upsell-modal {
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
          }

          .hmstudio-upsell-content {
            background: white;
            padding: 40px;
            border-radius: 12px;
            width: 90%;
            max-width: 1000px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            transform: translateY(20px);
            transition: transform 0.3s ease;
          }

          .hmstudio-upsell-header {
            text-align: center;
            margin-bottom: 30px;
          }

          .hmstudio-upsell-title {
            font-size: 28px;
            margin-bottom: 10px;
            color: #333;
          }

          .hmstudio-upsell-subtitle {
            font-size: 18px;
            color: #666;
            margin: 0;
          }

          .hmstudio-upsell-main {
            display: flex;
            gap: 30px;
            align-items: flex-start;
          }

          .hmstudio-upsell-sidebar {
            width: 250px;
            flex-shrink: 0;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            position: sticky;
            top: 20px;
          }

          .hmstudio-upsell-products {
            display: grid;
            grid-template-columns: repeat(auto-fit, 180px);
            gap: 20px;
            justify-content: center;
            width: 100%;
            margin: 0 auto;
          }

          .hmstudio-upsell-product-card {
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          @media (max-width: 768px) {
            .hmstudio-upsell-content {
              padding: 20px;
              width: 100%;
              height: 100vh;
              border-radius: 12px;
              margin: 0;
            }

            .hmstudio-upsell-main {
              flex-direction: column;
              gap: 20px;
            }

           @media (max-width: 768px) {
              .hmstudio-upsell-main {
              flex-direction: row;
        align-items: center !important;
        width: 80% !important;
              gap: 20px;
            }


            .hmstudio-upsell-sidebar {
              width: 100%;
              position: static;
              order: 2;
            }

            .hmstudio-upsell-products {
              grid-template-columns: 1fr;
              gap: 15px;
              order: 1;
            }

            .hmstudio-upsell-title {
              font-size: 20px;
            }

            .hmstudio-upsell-subtitle {
              font-size: 14px;
            }

            .hmstudio-upsell-product-card {
              padding: 10px;
            }
          }

          @media (max-width: 480px) {
            .hmstudio-upsell-content {
              padding: 15px;
              width: 92%;
            }

            .hmstudio-upsell-title {
              font-size: 18px;
            }

            .hmstudio-upsell-product-card img {
              height: 120px;
            }
          }
        `;
        document.head.appendChild(styleTag);

        const modal = document.createElement('div');
        modal.className = 'hmstudio-upsell-modal';
        if (isRTL) modal.style.direction = 'rtl';

        const content = document.createElement('div');
        content.className = 'hmstudio-upsell-content';

        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
          position: absolute;
          top: 15px;
          ${isRTL ? 'right' : 'left'}: 15px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 5px;
          line-height: 1;
          z-index: 1;
        `;
        closeButton.addEventListener('click', () => this.closeModal());

        // Header
        const header = document.createElement('div');
        header.className = 'hmstudio-upsell-header';

        const title = document.createElement('h2');
        title.className = 'hmstudio-upsell-title';
        title.textContent = currentLang === 'ar' ? 
          decodeURIComponent(campaign.textSettings.titleAr) : 
          campaign.textSettings.titleEn;

        const subtitle = document.createElement('p');
        subtitle.className = 'hmstudio-upsell-subtitle';
        subtitle.textContent = currentLang === 'ar' ? 
          decodeURIComponent(campaign.textSettings.subtitleAr) : 
          campaign.textSettings.subtitleEn;

        header.appendChild(title);
        header.appendChild(subtitle);

        // Main content wrapper
        const mainWrapper = document.createElement('div');
        mainWrapper.className = 'hmstudio-upsell-main';

        // Sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'hmstudio-upsell-sidebar';

        // Add All to Cart button
        const addAllButton = document.createElement('button');
        addAllButton.textContent = currentLang === 'ar' ? 'أضف الكل إلى السلة' : 'Add All to Cart';
        addAllButton.style.cssText = `
          width: 100%;
          padding: 12px 20px;
          background: #000;
          color: white;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        `;

        // Products grid
        const productsGrid = document.createElement('div');
        productsGrid.className = 'hmstudio-upsell-products';

        // Create and append product cards
        const productCards = await Promise.all(
          campaign.upsellProducts.map(product => this.createProductCard(product))
        );

        productCards.filter(Boolean).forEach(card => {
          productsGrid.appendChild(card);
        });

        // Assemble the modal
        sidebar.appendChild(addAllButton);
        mainWrapper.appendChild(sidebar);
        mainWrapper.appendChild(productsGrid);

        content.appendChild(closeButton);
        content.appendChild(header);
        content.appendChild(mainWrapper);
        modal.appendChild(content);

        // Add to document and animate in
        document.body.appendChild(modal);
        requestAnimationFrame(() => {
          modal.style.opacity = '1';
          content.style.transform = 'translateY(0)';
        });

        this.currentModal = modal;

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal();
        });

        // Handle escape key
        const handleEscape = (e) => {
          if (e.key === 'Escape') this.closeModal();
        };
        document.addEventListener('keydown', handleEscape);

        // Clean up event listener when modal closes
        modal.addEventListener('remove', () => {
          document.removeEventListener('keydown', handleEscape);
        });

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
          showUpsellModal: (...args) => this.showUpsellModal.apply(this, args),
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
