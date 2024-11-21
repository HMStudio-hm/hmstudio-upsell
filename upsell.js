// src/scripts/upsell.js v1.9.3
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

    formatPrice(price, currentLang) {
      if (!price) return currentLang === 'ar' ? '0 ر.س' : 'A$0.00';
      
      try {
        // Convert price to number if it's a string
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        
        // Format price to 2 decimal places
        const formattedPrice = numPrice.toFixed(2);
        
        // Return formatted price based on language
        if (currentLang === 'ar') {
          return `${formattedPrice} ر.س`;
        } else {
          return `A$${formattedPrice}`;
        }
      } catch (error) {
        console.error('Error formatting price:', error);
        return currentLang === 'ar' ? '0 ر.س' : 'A$0.00';
      }
    },
  
    // Original formatTotalPrice method for bundle total
    formatTotalPrice(prices, currentLang) {
      try {
        const total = prices.reduce((sum, price) => sum + (typeof price === 'string' ? parseFloat(price) : price), 0);
        return this.formatPrice(total, currentLang);
      } catch (error) {
        console.error('Error formatting total price:', error);
        return this.formatPrice(0, currentLang);
      }
    },

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
      console.log('Showing bundle-style upsell modal:', { campaign, productCart });
      
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
          padding: 40px;
          border-radius: 12px;
          width: 1000px;
          max-width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          transform: translateY(20px);
          transition: transform 0.3s ease;
          direction: ${isRTL ? 'rtl' : 'ltr'};
          display: flex;
          flex-direction: column;
        `;
  
        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
          position: absolute;
          top: 20px;
          ${isRTL ? 'left' : 'right'}: 20px;
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
  
        // Header section
        const header = document.createElement('div');
        header.style.cssText = `
          text-align: center;
          margin-bottom: 30px;
        `;
  
        const title = document.createElement('h2');
        title.textContent = currentLang === 'ar' ? 'اشترِ المجموعة لتوفر أكثر' : 'Buy a pack to save';
        title.style.cssText = `
          font-size: 28px;
          margin-bottom: 10px;
          color: #333;
        `;
  
        const subtitle = document.createElement('p');
        subtitle.textContent = currentLang === 'ar' 
          ? 'أضف المجموعة للحصول على خصم 15%' 
          : 'Add bundle to get 15% off';
        subtitle.style.cssText = `
          font-size: 18px;
          color: #666;
          margin: 0;
        `;
  
        header.appendChild(title);
        header.appendChild(subtitle);
  
        // Main content wrapper for products and button
        const mainWrapper = document.createElement('div');
        mainWrapper.style.cssText = `
          display: flex;
          gap: 30px;
          align-items: flex-start;
        `;
  
        // Products grid with smaller cards
        const productsGrid = document.createElement('div');
        productsGrid.style.cssText = `
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
          flex: 1;
        `;
  
        // Create product cards
        const productCards = await Promise.all(
          campaign.upsellProducts.map(async (product, index) => {
            const card = document.createElement('div');
            card.style.cssText = `
              position: relative;
              text-align: center;
              padding: 15px;
              border: 1px solid #eee;
              border-radius: 8px;
              max-width: 180px;
            `;
            card.setAttribute('data-product-id', product.id);
  
            const productData = await this.fetchProductData(product.id);
            
            // Product image
            const img = document.createElement('img');
            img.src = productData.images[0]?.url || '';
            img.alt = product.name || productData.name[currentLang];
            img.style.cssText = `
              width: 100%;
              height: 150px;
              object-fit: contain;
              margin-bottom: 12px;
            `;
  
            // Product name
            const name = document.createElement('h3');
            name.textContent = product.name || productData.name[currentLang];
            name.style.cssText = `
              font-size: 14px;
              margin: 8px 0;
              color: #333;
              min-height: 40px;
            `;
  
            // Variants selector
            const variantSelect = document.createElement('select');
            variantSelect.style.cssText = `
              width: 100%;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
              margin-bottom: 10px;
              font-size: 13px;
            `;
  
            // Add variants if available
            if (productData.variants && productData.variants.length > 0) {
              const defaultOption = document.createElement('option');
              defaultOption.value = '';
              defaultOption.textContent = currentLang === 'ar' ? 'اختر النوع' : 'Select variant';
              variantSelect.appendChild(defaultOption);
  
              productData.variants.forEach(variant => {
                const option = document.createElement('option');
                option.value = variant.id;
                const variantText = variant.attributes
                  .map(attr => attr.value[currentLang])
                  .join(' - ');
                option.textContent = variantText;
                variantSelect.appendChild(option);
              });
            }
  
            // Quantity selector
            const quantityContainer = document.createElement('div');
            quantityContainer.style.cssText = `
              margin: 10px 0;
            `;
  
            const quantityLabel = document.createElement('div');
            quantityLabel.textContent = currentLang === 'ar' ? 'الكمية' : 'Quantity';
            quantityLabel.style.cssText = `
              font-size: 13px;
              color: #666;
              margin-bottom: 5px;
            `;
  
            const quantityWrapper = document.createElement('div');
            quantityWrapper.style.cssText = `
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 5px;
            `;
  
            const decreaseBtn = document.createElement('button');
            decreaseBtn.textContent = '-';
            decreaseBtn.style.cssText = `
              width: 24px;
              height: 24px;
              border: 1px solid #ddd;
              background: #f5f5f5;
              border-radius: 4px;
              cursor: pointer;
            `;
  
            const quantityInput = document.createElement('input');
            quantityInput.type = 'number';
            quantityInput.min = '1';
            quantityInput.max = '10';
            quantityInput.value = '1';
            quantityInput.style.cssText = `
              width: 40px;
              height: 24px;
              border: 1px solid #ddd;
              border-radius: 4px;
              text-align: center;
              -moz-appearance: textfield;
            `;
  
            const increaseBtn = document.createElement('button');
            increaseBtn.textContent = '+';
            increaseBtn.style.cssText = decreaseBtn.style.cssText;
  
            // Quantity controls functionality
            decreaseBtn.addEventListener('click', () => {
              let value = parseInt(quantityInput.value);
              if (value > 1) {
                quantityInput.value = value - 1;
              }
            });
  
            increaseBtn.addEventListener('click', () => {
              let value = parseInt(quantityInput.value);
              if (value < 10) {
                quantityInput.value = value + 1;
              }
            });
  
            quantityInput.addEventListener('change', () => {
              let value = parseInt(quantityInput.value);
              if (isNaN(value) || value < 1) value = 1;
              if (value > 10) value = 10;
              quantityInput.value = value;
            });
  
            // Price
            const price = document.createElement('div');
            price.textContent = this.formatPrice(productData.price, currentLang);
            price.style.cssText = `
              font-weight: bold;
              font-size: 14px;
              margin: 8px 0;
            `;
  
            // Add to Cart button using store's primary color
            const addButton = document.createElement('button');
            addButton.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
            addButton.style.cssText = `
              background: var(--theme-primary, #00b286);
              color: white;
              border: none;
              border-radius: 20px;
              padding: 8px 15px;
              font-size: 13px;
              cursor: pointer;
              width: 100%;
              transition: opacity 0.3s;
            `;
  
            addButton.addEventListener('mouseover', () => {
              addButton.style.opacity = '0.9';
            });
  
            addButton.addEventListener('mouseout', () => {
              addButton.style.opacity = '1';
            });
  
            // Add to cart functionality
            addButton.addEventListener('click', async () => {
              const quantity = parseInt(quantityInput.value);
              const selectedVariantId = variantSelect.value || productData.id;
  
              try {
                const response = await zid.store.cart.addProduct({
                  formId: `product-form-${selectedVariantId}`,
                  data: {
                    product_id: selectedVariantId,
                    quantity: quantity
                  }
                });
  
                if (response.status === 'success') {
                  if (typeof setCartBadge === 'function') {
                    setCartBadge(response.data.cart.products_count);
                  }
                }
              } catch (error) {
                console.error('Error adding product to cart:', error);
                alert(currentLang === 'ar' 
                  ? 'حدث خطأ أثناء إضافة المنتج إلى السلة' 
                  : 'Error adding product to cart'
                );
              }
            });
  
            // Assemble quantity controls
            quantityWrapper.appendChild(decreaseBtn);
            quantityWrapper.appendChild(quantityInput);
            quantityWrapper.appendChild(increaseBtn);
            quantityContainer.appendChild(quantityLabel);
            quantityContainer.appendChild(quantityWrapper);
  
            // Assemble product card
            card.appendChild(img);
            card.appendChild(name);
            if (productData.variants && productData.variants.length > 0) {
              card.appendChild(variantSelect);
            }
            card.appendChild(quantityContainer);
            card.appendChild(price);
            card.appendChild(addButton);
  
            return card;
          })
        );
  
        productCards.forEach(card => productsGrid.appendChild(card));
  
        // Side section with Add all products button
        const sideSection = document.createElement('div');
        sideSection.style.cssText = `
          width: 250px;
          flex-shrink: 0;
          padding: 20px;
          position: sticky;
          top: 20px;
          display: flex;
          align-items: center;
        `;
  
        const addAllButton = document.createElement('button');
        addAllButton.textContent = currentLang === 'ar' ? 'أضف جميع المنتجات' : 'Add all products';
        addAllButton.style.cssText = `
          background: #000;
          color: white;
          border: none;
          border-radius: 25px;
          padding: 12px 20px;
          font-size: 16px;
          cursor: pointer;
          width: 100%;
          transition: background-color 0.3s;
        `;
  
        addAllButton.addEventListener('mouseover', () => {
          addAllButton.style.backgroundColor = '#333';
        });
  
        addAllButton.addEventListener('mouseout', () => {
          addAllButton.style.backgroundColor = '#000';
        });
  
        // Add all products functionality
        addAllButton.addEventListener('click', async () => {
          for (const product of campaign.upsellProducts) {
            const productCard = document.querySelector(`[data-product-id="${product.id}"]`);
            if (productCard) {
              const quantityInput = productCard.querySelector('input[type="number"]');
              const variantSelect = productCard.querySelector('select');
              
              const quantity = parseInt(quantityInput?.value || 1);
              const selectedVariantId = variantSelect?.value || product.id;
  
              try {
                await zid.store.cart.addProduct({
                  formId: `product-form-${selectedVariantId}`,
                  data: {
                    product_id: selectedVariantId,
                    quantity: quantity
                  }
                });
              } catch (error) {
                console.error('Error adding product to cart:', error);
              }
            }
          }
  
          // Close modal after adding all products
          this.closeModal();
        });
  
        sideSection.appendChild(addAllButton);
  
        // Assemble the layout
        mainWrapper.appendChild(productsGrid);
        mainWrapper.appendChild(sideSection);
  
        // Assemble modal
        content.appendChild(closeButton);
        content.appendChild(header);
        content.appendChild(mainWrapper);
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
      } catch (error) {
        console.error('Error creating bundle-style upsell modal:', error);
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
