// src/scripts/upsell.js v1.7.6
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

  function formatPrice(amount, currencySymbol = 'SR') {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const currentLang = getCurrentLanguage();
    return currentLang === 'ar' 
      ? `${formatter.format(amount)} ${currencySymbol}`
      : `${currencySymbol} ${formatter.format(amount)}`;
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
    selectedProducts: new Set(),
    totalPrice: 0,

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

    updateTotalPrice() {
      if (!this.currentModal) return;
      
      let total = 0;
      const cards = this.currentModal.querySelectorAll('.hmstudio-upsell-product-card');
      
      cards.forEach(card => {
        if (card.productData && card.productData.isSelected()) {
          const price = parseFloat(card.productData.price) || 0;
          const quantity = card.productData.getQuantity();
          total += price * quantity;
        }
      });

      this.totalPrice = total;

      const totalPriceElement = this.currentModal.querySelector('.total-price');
      if (totalPriceElement) {
        totalPriceElement.textContent = formatPrice(total);
      }

      return total;
    },

    updateAddToCartButton() {
      if (!this.currentModal) return;

      const cards = this.currentModal.querySelectorAll('.hmstudio-upsell-product-card');
      const addToCartBtn = this.currentModal.querySelector('.add-to-cart-btn');
      let selectedCount = 0;

      cards.forEach(card => {
        if (card.productData && card.productData.isSelected()) {
          selectedCount++;
        }
      });

      if (addToCartBtn) {
        const currentLang = getCurrentLanguage();
        addToCartBtn.style.display = (selectedCount > 0 && selectedCount <= 3) ? 'block' : 'none';
        
        // Update button text with selection count
        addToCartBtn.textContent = currentLang === 'ar'
          ? `إضافة المنتجات المحددة (${selectedCount})`
          : `Add selected items (${selectedCount})`;
      }

      // Update total section visibility
      const totalSection = this.currentModal.querySelector('.total-section');
      if (totalSection) {
        totalSection.style.display = selectedCount > 0 ? 'flex' : 'none';
      }
    },

    handleAddToCart() {
      if (!this.currentModal) return;

      const currentLang = getCurrentLanguage();
      const cards = this.currentModal.querySelectorAll('.hmstudio-upsell-product-card');
      const selectedProducts = [];
      let hasErrors = false;

      cards.forEach(card => {
        if (card.productData && card.productData.isSelected()) {
          const productData = card.productData;
          const selectedOptions = productData.getSelectedOptions();

          // Validate variants if product has options
          if (productData.has_options && productData.variants?.length > 0) {
            const requiredVariants = productData.variants[0].attributes.map(attr => 
              currentLang === 'ar' ? attr.name.ar : attr.name.en
            );

            const missingVariants = requiredVariants.filter(variant => !selectedOptions[variant]);

            if (missingVariants.length > 0) {
              const message = currentLang === 'ar'
                ? `الرجاء اختيار ${missingVariants.join(', ')} للمنتج ${productData.name}`
                : `Please select ${missingVariants.join(', ')} for ${productData.name}`;
              alert(message);
              hasErrors = true;
              return;
            }
          }

          selectedProducts.push({
            product_id: productData.id,
            quantity: productData.getQuantity(),
            options: selectedOptions
          });
        }
      });

      if (hasErrors) return;

      Promise.all(
        selectedProducts.map(product =>
          zid.store.cart.addProduct({
            data: {
              product_id: product.product_id,
              quantity: product.quantity,
              options: product.options
            }
          })
        )
      )
      .then(() => {
        const message = currentLang === 'ar'
          ? 'تمت إضافة المنتجات إلى السلة بنجاح'
          : 'Products added to cart successfully';
        alert(message);
        this.closeModal();
      })
      .catch(error => {
        console.error('Error adding products to cart:', error);
        const message = currentLang === 'ar'
          ? 'حدث خطأ أثناء إضافة المنتجات إلى السلة'
          : 'Error occurred while adding products to cart';
        alert(message);
      });
    },
    async createProductCard(product) {
      try {
        const fullProductData = await this.fetchProductData(product.id);
        const currentLang = getCurrentLanguage();
        const isRTL = currentLang === 'ar';
        const currencyText = currentLang === 'ar' ? 'ر.س' : 'SAR';
    
        let productName = fullProductData.name;
        if (typeof productName === 'object') {
          productName = currentLang === 'ar' ? productName.ar : productName.en;
        }
    
        const card = document.createElement('div');
        card.className = 'hmstudio-upsell-product-card';
        card.style.cssText = `
          background: white;
          border-radius: 12px;
          padding: 20px;
          width: 280px;
          border: 1px solid #eee;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          gap: 12px;
        `;
    
        // Product image
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = `
          width: 100%;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
        `;
    
        const image = document.createElement('img');
        image.src = fullProductData.images?.[0]?.url || product.thumbnail;
        image.alt = productName;
        image.style.cssText = `
          width: 100%;
          height: 100%;
          object-fit: contain;
        `;
        imageContainer.appendChild(image);
    
        // Product name
        const name = document.createElement('h3');
        name.textContent = productName;
        name.style.cssText = `
          font-size: 16px;
          font-weight: 500;
          color: #333;
          margin: 8px 0;
          ${isRTL ? 'text-align: right;' : 'text-align: left'}
        `;
    
        // Variants
        const variantsContainer = document.createElement('div');
        const selectedVariants = {};
    
        if (fullProductData.has_options && fullProductData.variants?.length > 0) {
          fullProductData.variants[0].attributes.forEach(attr => {
            const label = document.createElement('label');
            label.textContent = isRTL ? attr.name.ar : attr.name.en;
            label.style.cssText = `
              display: block;
              font-size: 14px;
              color: #666;
              margin: 8px 0 4px;
              ${isRTL ? 'text-align: right;' : 'text-align: left'}
            `;
    
            const select = document.createElement('select');
            select.style.cssText = `
              width: 100%;
              padding: 8px 12px;
              border: 1px solid #ddd;
              border-radius: 8px;
              background: white;
              ${isRTL ? 'text-align: right;' : 'text-align: left'}
            `;
    
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = isRTL ? 'اختر خيارًا' : 'Select an option';
            select.appendChild(placeholder);
    
            const options = [...new Set(
              fullProductData.variants
                .map(v => v.attributes
                  .find(a => a.name === attr.name)?.value[currentLang])
                .filter(Boolean)
            )];
    
            options.forEach(option => {
              const opt = document.createElement('option');
              opt.value = option;
              opt.textContent = option;
              select.appendChild(opt);
            });
    
            select.addEventListener('change', () => {
              selectedVariants[attr.name] = select.value;
            });
    
            variantsContainer.appendChild(label);
            variantsContainer.appendChild(select);
          });
        }
    
        // Quantity control
        const quantityContainer = document.createElement('div');
        let quantity = 1;
    
        quantityContainer.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: ${isRTL ? 'flex-end' : 'flex-start'};
          gap: 10px;
          margin: 12px 0;
        `;
    
        const quantityLabel = document.createElement('span');
        quantityLabel.textContent = isRTL ? 'الكمية:' : 'Quantity:';
        quantityLabel.style.cssText = `
          font-size: 14px;
          color: #666;
        `;
    
        const quantityWrapper = document.createElement('div');
        quantityWrapper.style.cssText = `
          display: flex;
          align-items: center;
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        `;
    
        const decreaseBtn = document.createElement('button');
        decreaseBtn.textContent = '-';
        const increaseBtn = document.createElement('button');
        increaseBtn.textContent = '+';
    
        const quantityBtnStyle = `
          width: 32px;
          height: 32px;
          border: none;
          background: #f8f8f8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        `;
    
        decreaseBtn.style.cssText = quantityBtnStyle;
        increaseBtn.style.cssText = quantityBtnStyle;
    
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.min = '1';
        quantityInput.max = '10';
        quantityInput.value = '1';
        quantityInput.style.cssText = `
          width: 40px;
          border: none;
          text-align: center;
          font-size: 14px;
          -moz-appearance: textfield;
        `;
    
        // Price display
        const priceContainer = document.createElement('div');
        priceContainer.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 8px 0;
          ${isRTL ? 'flex-direction: row-reverse;' : ''}
        `;
    
        const formattedPrice = isRTL
          ? `${(fullProductData.price || 0).toFixed(2)} ${currencyText}`
          : `${currencyText} ${(fullProductData.price || 0).toFixed(2)}`;
    
        const formattedSalePrice = fullProductData.sale_price
          ? (isRTL
              ? `${fullProductData.sale_price.toFixed(2)} ${currencyText}`
              : `${currencyText} ${fullProductData.sale_price.toFixed(2)}`)
          : null;
    
        const price = document.createElement('span');
        price.style.cssText = `
          font-size: 18px;
          font-weight: 600;
          color: ${formattedSalePrice ? '#e53e3e' : '#000'};
        `;
        price.textContent = formattedSalePrice || formattedPrice;
    
        if (formattedSalePrice) {
          const oldPrice = document.createElement('span');
          oldPrice.textContent = formattedPrice;
          oldPrice.style.cssText = `
            font-size: 14px;
            color: #999;
            text-decoration: line-through;
          `;
          priceContainer.appendChild(oldPrice);
        }
    
        priceContainer.appendChild(price);
    
        // Add to cart button
        const addToCartBtn = document.createElement('button');
        addToCartBtn.style.cssText = `
          width: 100%;
          padding: 12px;
          background: #000;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.3s;
          margin-top: 8px;
        `;
        addToCartBtn.textContent = isRTL ? 'أضف إلى السلة' : 'Add to Cart';
    
        addToCartBtn.addEventListener('mouseover', () => {
          addToCartBtn.style.backgroundColor = '#333';
        });
    
        addToCartBtn.addEventListener('mouseout', () => {
          addToCartBtn.style.backgroundColor = '#000';
        });
    
        addToCartBtn.addEventListener('click', async () => {
          if (fullProductData.has_options && Object.keys(selectedVariants).length === 0) {
            alert(isRTL ? 'الرجاء اختيار الخيارات المطلوبة' : 'Please select required options');
            return;
          }
    
          try {
            await zid.store.cart.addProduct({
              data: {
                product_id: fullProductData.id,
                quantity: quantity,
                options: selectedVariants
              }
            });
            
            this.closeModal();
          } catch (error) {
            console.error('Error adding to cart:', error);
            alert(isRTL 
              ? 'حدث خطأ أثناء الإضافة إلى السلة'
              : 'Error adding to cart'
            );
          }
        });
    
        // Event listeners for quantity
        decreaseBtn.addEventListener('click', () => {
          if (quantity > 1) {
            quantity--;
            quantityInput.value = quantity;
          }
        });
    
        increaseBtn.addEventListener('click', () => {
          if (quantity < 10) {
            quantity++;
            quantityInput.value = quantity;
          }
        });
    
        quantityInput.addEventListener('change', (e) => {
          let value = parseInt(e.target.value);
          if (isNaN(value) || value < 1) value = 1;
          if (value > 10) value = 10;
          quantity = value;
          quantityInput.value = quantity;
        });
    
        // Assemble quantity controls
        quantityWrapper.appendChild(decreaseBtn);
        quantityWrapper.appendChild(quantityInput);
        quantityWrapper.appendChild(increaseBtn);
        quantityContainer.appendChild(quantityLabel);
        quantityContainer.appendChild(quantityWrapper);
    
        // Assemble card
        card.appendChild(imageContainer);
        card.appendChild(name);
        card.appendChild(variantsContainer);
        card.appendChild(quantityContainer);
        card.appendChild(priceContainer);
        card.appendChild(addToCartBtn);
    
        return card;
      } catch (error) {
        console.error('Error creating product card:', error);
        return null;
      }
    },

    async showUpsellModal(campaign, productCart) {
      console.log('Showing upsell modal for campaign:', campaign);
      
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
        `;

        const content = document.createElement('div');
        content.className = 'hmstudio-upsell-content';
        content.style.cssText = `
          background: white;
          padding: 30px;
          border-radius: 16px;
          max-width: 900px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          direction: ${isRTL ? 'rtl' : 'ltr'};
        `;

        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
          position: absolute;
          top: 16px;
          ${isRTL ? 'left' : 'right'}: 16px;
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 4px;
          line-height: 1;
          z-index: 2;
        `;
        closeButton.addEventListener('click', () => this.closeModal());

        // Title and subtitle
        const titleText = currentLang === 'ar' ? 
          campaign.textSettings.titleAr : 
          campaign.textSettings.titleEn;

        const subtitleText = currentLang === 'ar' ? 
          campaign.textSettings.subtitleAr : 
          campaign.textSettings.subtitleEn;

        const header = document.createElement('div');
        header.style.cssText = `
          text-align: ${isRTL ? 'right' : 'left'};
          margin-bottom: 24px;
        `;

        const title = document.createElement('h2');
        title.textContent = titleText;
        title.style.cssText = `
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        `;

        const subtitle = document.createElement('p');
        subtitle.textContent = subtitleText;
        subtitle.style.cssText = `
          font-size: 16px;
          color: #666;
          margin: 0;
        `;

        header.appendChild(title);
        header.appendChild(subtitle);

        // Products container with horizontal scroll
        const productsContainer = document.createElement('div');
        productsContainer.style.cssText = `
          display: flex;
          gap: 24px;
          margin: 24px 0;
          overflow-x: auto;
          padding: 10px 0;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        `;

        // Create and add product cards
        const productCards = await Promise.all(
          campaign.upsellProducts.map(product => this.createProductCard(product))
        );

        productCards.filter(card => card !== null).forEach(card => {
          productsContainer.appendChild(card);
        });

        // Total section
        const totalSection = document.createElement('div');
        totalSection.className = 'total-section';
        totalSection.style.cssText = `
          display: none;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        `;

        const totalLabel = document.createElement('span');
        totalLabel.textContent = currentLang === 'ar' ? 'المجموع:' : 'Total:';
        totalLabel.style.cssText = `
          font-size: 18px;
          font-weight: 500;
          color: #333;
        `;

        const totalPrice = document.createElement('span');
        totalPrice.className = 'total-price';
        totalPrice.style.cssText = `
          font-size: 20px;
          font-weight: 600;
          color: #000;
        `;

        totalSection.appendChild(totalLabel);
        totalSection.appendChild(totalPrice);

       // Add to cart button
       const addToCartBtn = document.createElement('button');
       addToCartBtn.className = 'add-to-cart-btn';
       addToCartBtn.style.cssText = `
         width: 100%;
         padding: 16px;
         background: #000;
         color: white;
         border: none;
         border-radius: 8px;
         font-size: 16px;
         font-weight: 500;
         cursor: pointer;
         transition: background-color 0.3s ease;
         margin-top: 16px;
         display: none;
       `;
       addToCartBtn.textContent = currentLang === 'ar' ? 'إضافة المحدد إلى السلة' : 'Add selected to cart';
       
       addToCartBtn.addEventListener('mouseover', () => {
         addToCartBtn.style.backgroundColor = '#333';
       });
       
       addToCartBtn.addEventListener('mouseout', () => {
         addToCartBtn.style.backgroundColor = '#000';
       });

       addToCartBtn.addEventListener('click', () => this.handleAddToCart());

       // Assemble modal
       content.appendChild(closeButton);
       content.appendChild(header);
       content.appendChild(productsContainer);
       content.appendChild(totalSection);
       content.appendChild(addToCartBtn);
       modal.appendChild(content);

       // Add to DOM
       document.body.appendChild(modal);

       // Show modal with animation
       requestAnimationFrame(() => {
         modal.style.opacity = '1';
         content.style.transform = 'translateY(0)';
       });

       this.currentModal = modal;

       // Handle escape key
       const handleEscape = (e) => {
         if (e.key === 'Escape') {
           this.closeModal();
           document.removeEventListener('keydown', handleEscape);
         }
       };
       document.addEventListener('keydown', handleEscape);

       // Handle click outside
       modal.addEventListener('click', (e) => {
         if (e.target === modal) {
           this.closeModal();
         }
       });

     } catch (error) {
       console.error('Error creating upsell modal:', error);
     }
   },

   closeModal() {
     if (this.currentModal) {
       const content = this.currentModal.querySelector('.hmstudio-upsell-content');
       
       // Animate out
       this.currentModal.style.opacity = '0';
       if (content) {
         content.style.transform = 'translateY(20px)';
       }

       // Remove after animation
       setTimeout(() => {
         if (this.currentModal && this.currentModal.parentElement) {
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

     // Add keyframe animation for spinner if needed
     if (!document.getElementById('upsell-animations')) {
       const style = document.createElement('style');
       style.id = 'upsell-animations';
       style.textContent = `
         @keyframes spin {
           0% { transform: rotate(0deg); }
           100% { transform: rotate(360deg); }
         }
       `;
       document.head.appendChild(style);
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
