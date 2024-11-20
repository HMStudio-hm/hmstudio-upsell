// src/scripts/upsell.js v1.4.8
// HMStudio Upsell Feature

(function() {
  console.log('Upsell script initialized');

  function decodeText(text) {
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  }

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
      // First decode from base64
      const decodedData = atob(campaignsData);
      
      // Then parse the JSON
      const campaigns = JSON.parse(decodedData);

      // Return the campaigns without any additional encoding/decoding
      // The Arabic text should now be preserved as is
      return campaigns.map(campaign => ({
        ...campaign,
        titleAr: campaign.titleAr || '',
        subtitleAr: campaign.subtitleAr || '',
        titleEn: campaign.titleEn || '',
        subtitleEn: campaign.subtitleEn || ''
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

        // Add Arabic font to document if not already added
        if (!document.getElementById('arabic-font-style')) {
          const style = document.createElement('style');
          style.id = 'arabic-font-style';
          style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
          `;
          document.head.appendChild(style);
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
          font-family: ${isRTL ? 'Cairo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit'};
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
          z-index: 1;
          font-family: inherit;
        `;
        closeButton.addEventListener('click', () => this.closeModal());

        // Header section
        const headerSection = document.createElement('div');
        headerSection.style.cssText = `
          margin: 0 0 25px;
          padding-${isRTL ? 'left' : 'right'}: 30px;
        `;

        // Main Title
        const mainTitle = document.createElement('h2');
        mainTitle.textContent = currentLang === 'ar' ? campaign.titleAr : campaign.titleEn;
        mainTitle.style.cssText = `
          font-size: 1.75em;
          font-weight: 700;
          color: #333;
          margin: 0 0 10px;
          line-height: 1.3;
          font-family: ${isRTL ? 'Cairo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit'};
        `;
        headerSection.appendChild(mainTitle);

        // Second Title (if exists)
        const secondaryTitle = currentLang === 'ar' ? campaign.subtitleAr : campaign.subtitleEn;
        if (secondaryTitle) {
          const subtitle = document.createElement('p');
          subtitle.textContent = secondaryTitle;
          subtitle.style.cssText = `
            font-size: 1.1em;
            color: #666;
            margin: 0;
            line-height: 1.4;
            font-family: ${isRTL ? 'Cairo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit'};
          `;
          headerSection.appendChild(subtitle);
        }

        content.appendChild(closeButton);
        content.appendChild(headerSection);

        // Products Grid
        const productsGrid = document.createElement('div');
        productsGrid.style.cssText = `
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 20px;
        `;

        const productCards = await Promise.all(
          campaign.upsellProducts.map(product => this.createProductCard(product))
        );

        productCards.filter(card => card !== null).forEach(card => {
          productsGrid.appendChild(card);
        });

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
          direction: ${isRTL ? 'rtl' : 'ltr'};
          font-family: ${isRTL ? 'Cairo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit'};
        `;

        // Create form for API compatibility
        const form = document.createElement('form');
        form.id = `product-form-${fullProductData.id}`;

        // Product ID input
        const productIdInput = document.createElement('input');
        productIdInput.type = 'hidden';
        productIdInput.id = 'product-id';
        productIdInput.name = 'product_id';
        productIdInput.value = fullProductData.selected_product?.id || fullProductData.id;
        form.appendChild(productIdInput);

        // Quantity input
        const quantityInput = document.createElement('input');
        quantityInput.type = 'hidden';
        quantityInput.id = 'product-quantity';
        quantityInput.name = 'quantity';
        quantityInput.value = '1';
        form.appendChild(quantityInput);

        // Product image and title
        const productContent = document.createElement('div');
        productContent.innerHTML = `
          <img 
            src="${fullProductData.images?.[0]?.url || product.thumbnail}" 
            alt="${productName}" 
            style="width: 100%; height: 150px; object-fit: contain; margin-bottom: 10px;"
          >
          <h4 style="font-size: 1em; margin: 10px 0; min-height: 40px; font-family: inherit;">
            ${productName}
          </h4>
        `;
        card.appendChild(productContent);

        // Price container
        const priceContainer = document.createElement('div');
        priceContainer.style.cssText = `
          margin: 15px 0;
          font-weight: bold;
          font-family: inherit;
        `;

        const currentPrice = document.createElement('span');
        currentPrice.className = 'product-price';
        currentPrice.style.cssText = `
          color: var(--theme-primary, #00b286);
          font-family: inherit;
        `;

        const oldPrice = document.createElement('span');
        oldPrice.className = 'product-old-price';
        oldPrice.style.cssText = `
          text-decoration: line-through;
          color: #999;
          margin-${isRTL ? 'right' : 'left'}: 10px;
          display: none;
          font-family: inherit;
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
          font-family: ${isRTL ? 'Cairo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit'};
          font-weight: 500;
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

        // Handle add to cart
        addButton.addEventListener('click', () => {
          const spinners = form.querySelectorAll('.add-to-cart-progress');
          spinners.forEach(s => s.classList.remove('d-none'));

          zid.store.cart.addProduct({ 
            formId: form.id
          }).then(response => {
            console.log('Add to cart response:', response);
            if(response.status === 'success') {
              if (typeof setCartBadge === 'function') {
                setCartBadge(response.data.cart.products_count);
              }
              window.HMStudioUpsell.closeModal();
            }
            spinners.forEach(s => s.classList.add('d-none'));
          }).catch(error => {
            console.error('Add to cart error:', error);
            spinners.forEach(s => s.classList.add('d-none'));
          });
        });

        card.appendChild(form);
        card.appendChild(addButton);

      } catch (error) {
        console.error('Error creating product card:', error);
        return null;
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
