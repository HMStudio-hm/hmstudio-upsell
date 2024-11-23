// src/scripts/upsell.js v2.0.7
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

  function isMobile() {
    return window.innerWidth <= 768;
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
        if (!fullProductData) {
          throw new Error('Failed to fetch full product data');
        }

        const currentLang = getCurrentLanguage();
        const isRTL = currentLang === 'ar';
        const mobile = isMobile();

        let productName = fullProductData.name;
        if (typeof productName === 'object') {
          productName = currentLang === 'ar' ? productName.ar : productName.en;
        }

        const card = document.createElement('div');
        card.className = 'hmstudio-upsell-product-card';
        card.style.cssText = `
          background: white;
          border-radius: 8px;
          padding: ${mobile ? '15px' : '20px'};
          text-align: center;
          width: ${mobile ? '100%' : '180px'};
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: ${mobile ? '15px' : '0'};
        `;

        const productContent = document.createElement('div');
        productContent.style.cssText = `
          display: ${mobile ? 'flex' : 'block'};
          align-items: ${mobile ? 'center' : 'stretch'};
          gap: ${mobile ? '15px' : '0'};
          text-align: ${mobile ? 'start' : 'center'};
        `;

        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = `
          flex: ${mobile ? '0 0 100px' : '1'};
          margin-bottom: ${mobile ? '0' : '15px'};
        `;

        const productImage = document.createElement('img');
        productImage.src = fullProductData.images?.[0]?.url || product.thumbnail;
        productImage.alt = productName;
        productImage.style.cssText = `
          width: ${mobile ? '100px' : '100%'};
          height: ${mobile ? '100px' : '150px'};
          object-fit: contain;
          border-radius: 4px;
        `;
        imageContainer.appendChild(productImage);

        const detailsContainer = document.createElement('div');
        detailsContainer.style.cssText = `
          flex: ${mobile ? '1' : 'none'};
        `;

        const nameElement = document.createElement('h4');
        nameElement.textContent = productName;
        nameElement.style.cssText = `
          font-size: ${mobile ? '14px' : '16px'};
          margin: ${mobile ? '0 0 8px' : '15px 0'};
          font-weight: 500;
          color: #333;
        `;

        // Price display with support for sale prices
        const priceContainer = document.createElement('div');
        priceContainer.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: ${mobile ? 'start' : 'center'};
          margin-bottom: 15px;
          flex-wrap: wrap;
        `;

        const currentPrice = document.createElement('span');
        currentPrice.style.cssText = `
          font-size: ${mobile ? '16px' : '18px'};
          font-weight: bold;
          color: var(--theme-primary, #00b286);
        `;

        const oldPrice = document.createElement('span');
        oldPrice.style.cssText = `
          text-decoration: line-through;
          color: #999;
          font-size: ${mobile ? '14px' : '16px'};
        `;

        if (fullProductData.sale_price) {
          currentPrice.textContent = `${fullProductData.sale_price} ${isRTL ? 'ر.س' : 'SAR'}`;
          oldPrice.textContent = `${fullProductData.price} ${isRTL ? 'ر.س' : 'SAR'}`;
          priceContainer.appendChild(currentPrice);
          priceContainer.appendChild(oldPrice);
        } else {
          currentPrice.textContent = `${fullProductData.price} ${isRTL ? 'ر.س' : 'SAR'}`;
          priceContainer.appendChild(currentPrice);
        }

        // Quantity controls
        const quantityContainer = document.createElement('div');
        quantityContainer.style.cssText = `
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: ${mobile ? 'start' : 'center'};
          margin: ${mobile ? '15px 0' : '20px 0'};
        `;

        const quantityControls = document.createElement('div');
        quantityControls.style.cssText = `
          display: flex;
          align-items: center;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        `;

        const createQuantityButton = (text) => {
          const button = document.createElement('button');
          button.textContent = text;
          button.style.cssText = `
            width: 32px;
            height: 32px;
            border: none;
            background: #f5f5f5;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          `;
          return button;
        };

        const minusButton = createQuantityButton('-');
        const plusButton = createQuantityButton('+');
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.value = '1';
        quantityInput.min = '1';
        quantityInput.style.cssText = `
          width: 40px;
          height: 32px;
          border: none;
          border-left: 1px solid #ddd;
          border-right: 1px solid #ddd;
          text-align: center;
          -moz-appearance: textfield;
        `;

        quantityControls.appendChild(minusButton);
        quantityControls.appendChild(quantityInput);
        quantityControls.appendChild(plusButton);
        quantityContainer.appendChild(quantityControls);

        // Add to cart button
        const addButton = document.createElement('button');
        addButton.textContent = isRTL ? 'أضف إلى السلة' : 'Add to Cart';
        addButton.style.cssText = `
          width: 100%;
          padding: 10px;
          background: var(--theme-primary, #00b286);
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: opacity 0.3s;
        `;

        // Assemble the card
        if (mobile) {
          detailsContainer.appendChild(nameElement);
          detailsContainer.appendChild(priceContainer);
          productContent.appendChild(imageContainer);
          productContent.appendChild(detailsContainer);
          card.appendChild(productContent);
          card.appendChild(quantityContainer);
          card.appendChild(addButton);
        } else {
          card.appendChild(imageContainer);
          card.appendChild(nameElement);
          card.appendChild(priceContainer);
          card.appendChild(quantityContainer);
          card.appendChild(addButton);
        }

        return card;
      } catch (error) {
        console.error('Error creating product card:', error);
        return null;
      }
    },

    async showUpsellModal(campaign, productCart) {
      console.log('Showing upsell modal:', { campaign, productCart });
      
      if (!campaign || !campaign.upsellProducts || campaign.upsellProducts.length === 0) {
        console.warn('Invalid campaign data:', campaign);
        return;
      }

      const currentLang = getCurrentLanguage();
      const isRTL = currentLang === 'ar';
      const mobile = isMobile();

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
          align-items: ${mobile ? 'flex-start' : 'center'};
          z-index: 999999;
        `;

        const content = document.createElement('div');
        content.className = 'hmstudio-upsell-content';
        content.style.cssText = `
          background: white;
          width: ${mobile ? '100%' : '90%'};
          max-width: ${mobile ? '100%' : '800px'};
          min-height: ${mobile ? '100vh' : 'auto'};
          max-height: ${mobile ? '100vh' : '90vh'};
          overflow-y: auto;
          position: relative;
          direction: ${isRTL ? 'rtl' : 'ltr'};
          display: flex;
          flex-direction: column;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
          padding: ${mobile ? '15px' : '25px'};
          text-align: center;
          border-bottom: 1px solid #eee;
          position: relative;
        `;

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
          position: absolute;
          ${isRTL ? 'left' : 'right'}: 15px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 5px;
          line-height: 1;
        `;
        closeButton.addEventListener('click', () => this.closeModal());

        const title = document.createElement('h2');
        title.textContent = currentLang === 'ar' ? 
          decodeURIComponent(campaign.textSettings.titleAr) : 
          campaign.textSettings.titleEn;
        title.style.cssText = `
          font-size: ${mobile ? '18px' : '24px'};
          margin: 0;
          padding: 0 30px;
          color: #333;
        `;

        const subtitle = document.createElement('p');
        subtitle.textContent = currentLang === 'ar' ? 
          decodeURIComponent(campaign.textSettings.subtitleAr) : 
          campaign.textSettings.subtitleEn;
        subtitle.style.cssText = `
          font-size: ${mobile ? '14px' : '16px'};
          margin: 10px 0 0;
          color: #666;
        `;

        header.appendChild(closeButton);
        header.appendChild(title);
        header.appendChild(subtitle);

        // Products container
        const productsContainer = document.createElement('div');
        productsContainer.style.cssText = `
          padding: ${mobile ? '15px' : '25px'};
          flex: 1;
          overflow-y: auto;
        `;

        // Create and append product cards
        const productCards = await Promise.all(
          campaign.upsellProducts.map(async (product) => {
            return await this.createProductCard(product);
          })
        );

        productCards.filter(card => card !== null).forEach(card => {
          productsContainer.appendChild(card);
        });

        // Add All to Cart button container (fixed at bottom for mobile)
        const addAllContainer = document.createElement('div');
        addAllContainer.style.cssText = `
          padding: 15px;
          background: white;
          border-top: 1px solid #eee;
          ${mobile ? 'position: sticky; bottom: 0;' : ''}
        `;
        
       const addAllButton = document.createElement('button');
       addAllButton.textContent = currentLang === 'ar' ? 'أضف الكل إلى السلة' : 'Add All to Cart';
       addAllButton.style.cssText = `
         width: 100%;
         padding: ${mobile ? '12px' : '15px'};
         background: var(--theme-primary, #00b286);
         color: white;
         border: none;
         border-radius: 25px;
         font-size: ${mobile ? '16px' : '18px'};
         font-weight: 500;
         cursor: pointer;
         transition: opacity 0.3s;
         display: flex;
         align-items: center;
         justify-content: center;
       `;

       addAllButton.addEventListener('mouseover', () => {
         addAllButton.style.opacity = '0.9';
       });

       addAllButton.addEventListener('mouseout', () => {
         addAllButton.style.opacity = '1';
       });

       addAllButton.addEventListener('click', async () => {
         const forms = content.querySelectorAll('form');
         const variantForms = Array.from(forms).filter(form => form.querySelector('.variant-select'));
         
         // Check if all variants are selected
         const allVariantsSelected = variantForms.every(form => {
           const selects = form.querySelectorAll('.variant-select');
           return Array.from(selects).every(select => select.value !== '');
         });

         if (!allVariantsSelected) {
           const message = currentLang === 'ar' 
             ? 'الرجاء اختيار جميع الخيارات المطلوبة قبل الإضافة إلى السلة'
             : 'Please select all required options before adding to cart';
           alert(message);
           return;
         }

         const loadingSpinner = document.createElement('div');
         loadingSpinner.style.cssText = `
           width: 20px;
           height: 20px;
           border: 2px solid #fff;
           border-top-color: transparent;
           border-radius: 50%;
           margin-${isRTL ? 'left' : 'right'}: 10px;
           animation: spin 1s linear infinite;
         `;
         addAllButton.insertBefore(loadingSpinner, addAllButton.firstChild);
         addAllButton.disabled = true;
         addAllButton.style.opacity = '0.7';

         try {
           for (const form of forms) {
             await new Promise((resolve) => {
               zid.store.cart.addProduct({ formId: form.id })
                 .then((response) => {
                   console.log('Add to cart response:', response);
                   if (response.status === 'success' && typeof setCartBadge === 'function') {
                     setCartBadge(response.data.cart.products_count);
                   }
                   resolve();
                 })
                 .catch((error) => {
                   console.error('Add to cart error:', error);
                   resolve();
                 });
             });
           }
           this.closeModal();
         } catch (error) {
           console.error('Error adding products to cart:', error);
         } finally {
           if (loadingSpinner) {
             loadingSpinner.remove();
           }
           addAllButton.disabled = false;
           addAllButton.style.opacity = '1';
         }
       });

       // Assemble the modal
       addAllContainer.appendChild(addAllButton);
       content.appendChild(header);
       content.appendChild(productsContainer);
       content.appendChild(addAllContainer);
       modal.appendChild(content);
       document.body.appendChild(modal);

       // Add animation styles
       const styleSheet = document.createElement('style');
       styleSheet.textContent = `
         @keyframes spin {
           to { transform: rotate(360deg); }
         }
       `;
       document.head.appendChild(styleSheet);

       // Show modal with animation
       requestAnimationFrame(() => {
         modal.style.opacity = '1';
         content.style.transform = 'translateY(0)';
       });

       this.currentModal = modal;

       // Handle scroll behavior on mobile
       if (mobile) {
         document.body.style.overflow = 'hidden';
       }

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

       // Restore scroll behavior
       document.body.style.overflow = '';

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
     
     if (!window.HMStudioUpsell) {
       window.HMStudioUpsell = {
         showUpsellModal: (...args) => this.showUpsellModal.apply(this, args),
         closeModal: () => this.closeModal()
       };
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
         const isMobile = window.innerWidth <= 768;
         if (content) {
           content.style.width = isMobile ? '100%' : '90%';
           content.style.maxWidth = isMobile ? '100%' : '800px';
           content.style.height = isMobile ? '100vh' : 'auto';
           content.style.maxHeight = isMobile ? '100vh' : '90vh';
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
