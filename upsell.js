// src/scripts/upsell.js v1.8.1
// HMStudio Upsell Feature - Horizontal Layout and Button Update

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
      
      // Decode the URL-encoded Arabic text
      return parsedData.map(campaign => ({
        ...campaign,
        textSettings: {
          titleAr: decodeURIComponent(campaign.textSettings?.titleAr || ''),
          titleEn: campaign.textSettings?.titleEn || '',
          subtitleAr: decodeURIComponent(campaign.textSettings?.subtitleAr || ''),
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
        card.style.cssText = `
          display: flex;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        `;

        // Create form with proper structure for Zid API
        const form = document.createElement('form');
        form.id = `product-form-${fullProductData.id}`;
        form.style.cssText = `
          display: flex;
          align-items: center;
          width: 100%;
        `;

        // Product ID input following Zid's convention
        const productIdInput = document.createElement('input');
        productIdInput.type = 'hidden';
        productIdInput.id = 'product-id';  // Required by Zid
        productIdInput.name = 'product_id';
        productIdInput.value = fullProductData.selected_product?.id || fullProductData.id;
        form.appendChild(productIdInput);

        // Product image
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = `
          width: 100px;
          height: 100px;
          margin-${isRTL ? 'left' : 'right'}: 20px;
          flex-shrink: 0;
        `;
        const productImage = document.createElement('img');
        productImage.src = fullProductData.images?.[0]?.url || product.thumbnail;
        productImage.alt = productName;
        productImage.style.cssText = `
          width: 100%;
          height: 100%;
          object-fit: contain;
        `;
        imageContainer.appendChild(productImage);
        form.appendChild(imageContainer);

        // Product details
        const detailsContainer = document.createElement('div');
        detailsContainer.style.cssText = `
          flex-grow: 1;
        `;

        // Product name
        const nameElement = document.createElement('h4');
        nameElement.textContent = productName;
        nameElement.style.cssText = `
          font-size: 1.1em;
          margin: 0 0 10px;
          font-weight: bold;
        `;
        detailsContainer.appendChild(nameElement);

        // Price display
        const priceContainer = document.createElement('div');
        priceContainer.style.cssText = `
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        `;
        
        const currentPrice = document.createElement('span');
        currentPrice.className = 'product-price';
        currentPrice.style.cssText = `
          font-weight: bold;
          font-size: 1.2em;
          color: var(--theme-primary, #00b286);
        `;
        
        const oldPrice = document.createElement('span');
        oldPrice.className = 'product-old-price';
        oldPrice.style.cssText = `
          text-decoration: line-through;
          color: #999;
          margin-${isRTL ? 'right' : 'left'}: 10px;
          font-size: 0.9em;
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
        detailsContainer.appendChild(priceContainer);

        // Add variants section if product has options
        if (fullProductData.has_options && fullProductData.variants?.length > 0) {
          const variantsSection = this.createVariantsSection(fullProductData, currentLang);
          detailsContainer.appendChild(variantsSection);

          // Initialize with default variant
          if (fullProductData.selected_product) {
            this.updateSelectedVariant(fullProductData, form);
          }
        }

        form.appendChild(detailsContainer);

        // Quantity input
        const quantityContainer = document.createElement('div');
        quantityContainer.style.cssText = `
          display: flex;
          align-items: center;
          margin-${isRTL ? 'left' : 'right'}: 20px;
        `;

        const decreaseBtn = document.createElement('button');
        decreaseBtn.textContent = '-';
        decreaseBtn.type = 'button';
        decreaseBtn.style.cssText = `
          width: 30px;
          height: 30px;
          border: 1px solid #ddd;
          background: #f8f8f8;
          cursor: pointer;
        `;

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.id = 'product-quantity';  // Required by Zid
        quantityInput.name = 'quantity';
        quantityInput.value = '1';
        quantityInput.min = '1';
        quantityInput.style.cssText = `
          width: 40px;
          height: 30px;
          text-align: center;
          border: 1px solid #ddd;
          border-left: none;
          border-right: none;
        `;

        const increaseBtn = document.createElement('button');
        increaseBtn.textContent = '+';
        increaseBtn.type = 'button';
        increaseBtn.style.cssText = `
          width: 30px;
          height: 30px;
          border: 1px solid #ddd;
          background: #f8f8f8;
          cursor: pointer;
        `;

        decreaseBtn.addEventListener('click', () => {
          if (parseInt(quantityInput.value) > 1) {
            quantityInput.value = parseInt(quantityInput.value) - 1;
          }
        });

        increaseBtn.addEventListener('click', () => {
          quantityInput.value = parseInt(quantityInput.value) + 1;
        });

        quantityContainer.appendChild(decreaseBtn);
        quantityContainer.appendChild(quantityInput);
        quantityContainer.appendChild(increaseBtn);
        form.appendChild(quantityContainer);

        // Add to cart button with spinner
        const addButton = document.createElement('button');
        addButton.className = 'btn btn-primary add-to-cart-btn';
        addButton.type = 'button';
        addButton.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
        addButton.style.cssText = `
          background: var(--theme-primary, #00b286);
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1em;
          display: flex;
          align-items: center;
          justify-content: center;
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
          margin-${isRTL ? 'left' : 'right'}: 10px;
        `;
        addButton.insertBefore(spinner, addButton.firstChild);

        // Add to cart handler using Zid's convention
        addButton.addEventListener('click', function() {
          // Check if product has variants
          if (fullProductData.has_options && fullProductData.variants?.length > 0) {
            // Get all variant selections
            const selectedVariants = {};
            const missingSelections = [];
            
            form.querySelectorAll('.variant-select').forEach(select => {
              const labelText = select.previousElementSibling.textContent;
              if (!select.value) {
                missingSelections.push(labelText);
              }
              selectedVariants[labelText] = select.value;
            });
        
            // Check if all variants are selected
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
              window.HMStudioUpsell.closeModal();
            }
            spinners.forEach(s => s.classList.add('d-none'));
          }).catch(function(error) {
            console.error('Add to cart error:', error);
            spinners.forEach(s => s.classList.add('d-none'));
          });
        });

        form.appendChild(addButton);
        card.appendChild(form);

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
        margin-bottom: 10px;
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
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 100%;
            max-width: 200px;
          `;

          const labelText = currentLang === 'ar' ? attr.slug : attr.name;
          
          const label = document.createElement('label');
          label.textContent = labelText;
          label.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 0.9em;
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

        const addToCartBtn = form.querySelector('.add-to-cart-btn');
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
      console.log('Received campaign data:', campaign);
    
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
          padding: 30px;
          border-radius: 10px;
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

        // Title with decoded text
        const title = document.createElement('h3');
        title.style.cssText = `
          font-size: 1.6em;
          margin: 0 0 20px;
          padding-${isRTL ? 'left' : 'right'}: 30px;
          color: #333;
          font-weight: bold;
        `;
        title.textContent = currentLang === 'ar' 
          ? decodeURIComponent(campaign.textSettings.titleAr) 
          : campaign.textSettings.titleEn;

        // Subtitle with decoded text
        const subtitle = document.createElement('p');
        subtitle.style.cssText = `
          color: #666;
          margin-bottom: 20px;
          font-size: 1.1em;
        `;
        subtitle.textContent = currentLang === 'ar'
          ? decodeURIComponent(campaign.textSettings.subtitleAr)
          : campaign.textSettings.subtitleEn;

        // Products container
        const productsContainer = document.createElement('div');
        productsContainer.style.cssText = `
          display: flex;
          flex-direction: row;
          overflow-x: auto;
          gap: 20px;
          margin-top: 20px;
        `;

        // Create and add product cards
        const productCards = await Promise.all(
          campaign.upsellProducts.map(product => this.createProductCard(product))
        );

        productCards.filter(card => card !== null).forEach(card => {
          productsContainer.appendChild(card);
        });

        // Add all to cart button
        const addAllButton = document.createElement('button');
        addAllButton.className = 'btn btn-primary add-all-to-cart-btn';
        addAllButton.type = 'button';
        addAllButton.textContent = currentLang === 'ar' ? 'أضف الكل إلى السلة' : 'Add selected to cart';
        addAllButton.style.cssText = `
          background: var(--theme-primary, #00b286);
          color: white;
          padding: 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1.1em;
          position: absolute;
          bottom: 15px;
          ${isRTL ? 'right' : 'left'}: 15px;
        `;
        addAllButton.addEventListener('click', () => {
          console.log('Add all to cart clicked');
          // Implement add all to cart functionality
          const forms = content.querySelectorAll('form');
          forms.forEach(form => {
            const addToCartBtn = form.querySelector('.add-to-cart-btn');
            if (addToCartBtn) {
              addToCartBtn.click();
            }
          });
        });

        // Assemble modal
        content.appendChild(closeButton);
        content.appendChild(title);
        content.appendChild(subtitle);
        content.appendChild(productsContainer);
        content.appendChild(addAllButton);
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

