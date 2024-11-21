// src/scripts/upsell.js v1.7.7
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
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;

        // Create form with proper structure for Zid API
        const form = document.createElement('form');
        form.id = `product-form-${fullProductData.id}`;

        // Product ID input following Zid's convention
        const productIdInput = document.createElement('input');
        productIdInput.type = 'hidden';
        productIdInput.id = 'product-id';  // Required by Zid
        productIdInput.name = 'product_id';
        productIdInput.value = fullProductData.selected_product?.id || fullProductData.id;
        form.appendChild(productIdInput);

        // Quantity input following Zid's convention
        const quantityInput = document.createElement('input');
        quantityInput.type = 'hidden';
        quantityInput.id = 'product-quantity';  // Required by Zid
        quantityInput.name = 'quantity';
        quantityInput.value = '1';
        form.appendChild(quantityInput);

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

        // Add to cart button with spinner
        const addButton = document.createElement('button');
        addButton.className = 'btn btn-primary add-to-cart-btn';
        addButton.type = 'button';
        addButton.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
        addButton.style.cssText = `
          background: var(--theme-primary, #00b286);
          color: white;
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
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
      if (this.currentModal) {
        this.currentModal.remove();
      }
    
      const currentLang = getCurrentLanguage();
      const isRTL = currentLang === 'ar';
      const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary') || '#00b286';
    
      const modal = document.createElement('div');
      modal.className = 'hmstudio-upsell-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        padding: 1rem;
      `;
    
      const content = document.createElement('div');
      content.className = 'hmstudio-upsell-content';
      content.style.cssText = `
        background: white;
        border-radius: 0.75rem;
        width: 100%;
        max-width: 42rem;
        direction: ${isRTL ? 'rtl' : 'ltr'};
      `;
    
      // Header section
      const header = document.createElement('div');
      header.style.cssText = `
        position: relative;
        border-bottom: 1px solid #e5e7eb;
        padding: 1.5rem;
      `;
    
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = `
        position: absolute;
        top: 1rem;
        ${isRTL ? 'left' : 'right'}: 1rem;
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 9999px;
        color: #666;
        transition: background-color 0.2s;
      `;
      closeBtn.addEventListener('mouseover', () => closeBtn.style.backgroundColor = '#f3f4f6');
      closeBtn.addEventListener('mouseout', () => closeBtn.style.backgroundColor = 'transparent');
      closeBtn.addEventListener('click', () => this.closeModal());
    
      const titleWrapper = document.createElement('div');
      titleWrapper.style.cssText = `
        text-align: center;
        padding: 0 2rem;
      `;
    
      const title = document.createElement('h2');
      title.textContent = currentLang === 'ar' ? 'عروض خاصة لك!' : 'Special Offers for You!';
      title.style.cssText = `
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      `;
    
      const subtitle = document.createElement('p');
      subtitle.textContent = currentLang === 'ar' 
        ? `أضف هذه المنتجات المكملة لـ ${productCart.name}!`
        : `Add these complementary products for ${productCart.name}!`;
      subtitle.style.cssText = `
        color: #666;
        font-size: 1.1rem;
      `;
    
      // Products grid
      const productsContainer = document.createElement('div');
      productsContainer.style.cssText = `
        padding: 1.5rem;
      `;
    
      const productsGrid = document.createElement('div');
      productsGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(${campaign.upsellProducts.length === 1 ? '1' : '2'}, 1fr);
        gap: 1.5rem;
        ${campaign.upsellProducts.length === 1 ? 'max-width: 24rem; margin: 0 auto;' : ''}
      `;
    
      // Create product cards
      for (const product of campaign.upsellProducts) {
        const productData = await this.fetchProductData(product.id);
        if (!productData) continue;
    
        const card = document.createElement('div');
        card.style.cssText = `
          display: flex;
          flex-direction: column;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          height: 100%;
        `;
    
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = `
          position: relative;
          padding-bottom: 100%;
          margin-bottom: 1rem;
        `;
    
        const image = document.createElement('img');
        image.src = productData.images?.[0]?.url || product.thumbnail;
        image.alt = productData.name[currentLang] || product.name;
        image.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
        `;
    
        const name = document.createElement('h3');
        name.textContent = productData.name[currentLang] || product.name;
        name.style.cssText = `
          text-align: center;
          font-weight: 500;
          margin-bottom: 0.5rem;
          flex-grow: 1;
        `;
    
        const priceContainer = document.createElement('div');
        priceContainer.style.cssText = `
          text-align: center;
          margin-bottom: 1rem;
        `;
    
        if (productData.formatted_sale_price) {
          const salePrice = document.createElement('span');
          salePrice.textContent = productData.formatted_sale_price;
          salePrice.style.cssText = `
            font-size: 1.125rem;
            font-weight: bold;
            color: ${themeColor};
            margin-right: 0.5rem;
          `;
    
          const regularPrice = document.createElement('span');
          regularPrice.textContent = productData.formatted_price;
          regularPrice.style.cssText = `
            text-decoration: line-through;
            color: #9ca3af;
            font-size: 0.875rem;
          `;
    
          priceContainer.appendChild(salePrice);
          priceContainer.appendChild(regularPrice);
        } else {
          const price = document.createElement('span');
          price.textContent = productData.formatted_price;
          price.style.cssText = `
            font-size: 1.125rem;
            font-weight: bold;
            color: ${themeColor};
          `;
          priceContainer.appendChild(price);
        }
    
        const addToCartBtn = document.createElement('button');
        addToCartBtn.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
        addToCartBtn.style.cssText = `
          width: 100%;
          padding: 0.5rem 1rem;
          background-color: ${themeColor};
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        `;
    
        const spinner = document.createElement('div');
        spinner.style.cssText = `
          display: none;
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid white;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        `;
        addToCartBtn.appendChild(spinner);
    
        addToCartBtn.addEventListener('click', async () => {
          try {
            addToCartBtn.disabled = true;
            spinner.style.display = 'block';
            addToCartBtn.textContent = '';
    
            await zid.store.cart.addProduct({
              formId: `product-form-${productData.id}`,
              data: {
                product_id: productData.id,
                quantity: 1
              }
            });
    
            this.closeModal();
          } catch (error) {
            console.error('Error adding product to cart:', error);
            addToCartBtn.disabled = false;
            spinner.style.display = 'none';
            addToCartBtn.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
          }
        });
    
        imageContainer.appendChild(image);
        card.appendChild(imageContainer);
        card.appendChild(name);
        card.appendChild(priceContainer);
        card.appendChild(addToCartBtn);
        productsGrid.appendChild(card);
      }
    
      // Assemble the modal
      titleWrapper.appendChild(title);
      titleWrapper.appendChild(subtitle);
      header.appendChild(closeBtn);
      header.appendChild(titleWrapper);
      productsContainer.appendChild(productsGrid);
      content.appendChild(header);
      content.appendChild(productsContainer);
      modal.appendChild(content);
    
      // Add to DOM and store reference
      document.body.appendChild(modal);
      this.currentModal = modal;
    
      // Show with animation
      requestAnimationFrame(() => {
        modal.style.opacity = '1';
        content.style.transform = 'translateY(0)';
      });
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
