// src/scripts/upsell.js v2.0.8
// HMStudio Upsell Feature

(function() {
  console.log('Upsell script initialized');

  // Add responsive styles
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
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      flex: 1;
    }

    .hmstudio-upsell-product {
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }

    .hmstudio-add-all-btn {
      width: 100%;
      padding: 12px 20px;
      background: #000;
      color: white;
      border: none;
      border-radius: 25px;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    .hmstudio-add-all-btn:hover {
      background: #333;
    }

    /* Tablet and smaller devices */
    @media (max-width: 768px) {
      .hmstudio-upsell-content {
        padding: 20px;
        width: 95%;
        margin: 20px;
        max-height: 85vh;
      }

      .hmstudio-upsell-main {
        flex-direction: column;
        gap: 20px;
      }

      .hmstudio-upsell-sidebar {
        width: 100%;
        position: static;
        order: 2;
      }

      .hmstudio-upsell-products {
        grid-template-columns: repeat(2, 1fr);
        order: 1;
      }

      .hmstudio-upsell-title {
        font-size: 24px;
      }

      .hmstudio-upsell-subtitle {
        font-size: 16px;
      }
    }

    /* Mobile devices */
    @media (max-width: 480px) {
      .hmstudio-upsell-content {
        padding: 15px;
        width: 100%;
        margin: 10px;
        border-radius: 8px;
      }

      .hmstudio-upsell-products {
        grid-template-columns: 1fr;
      }

      .hmstudio-upsell-title {
        font-size: 20px;
      }

      .hmstudio-upsell-subtitle {
        font-size: 14px;
      }

      .hmstudio-upsell-product {
        padding: 10px;
      }

      .hmstudio-add-all-btn {
        padding: 15px;
        font-size: 14px;
      }
    }
  `;
  document.head.appendChild(styleTag);

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
          titleAr: decodeURIComponent(campaign.textSettings.titleAr || ''),
          titleEn: campaign.textSettings.titleEn || '',
          subtitleAr: decodeURIComponent(campaign.textSettings.subtitleAr || ''),
          subtitleEn: campaign.textSettings.subtitleEn || ''
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
        if (!fullProductData) {
          throw new Error('Failed to fetch full product data');
        }

        const currentLang = getCurrentLanguage();
        const isRTL = currentLang === 'ar';

        const card = document.createElement('div');
        card.className = 'hmstudio-upsell-product';

        // Product image
        const img = document.createElement('img');
        img.src = fullProductData.images?.[0]?.url || product.thumbnail;
        img.alt = fullProductData.name?.[currentLang] || fullProductData.name;
        img.style.cssText = `
          width: 100%;
          height: 150px;
          object-fit: contain;
          margin-bottom: 10px;
        `;

        // Product title
        const title = document.createElement('h4');
        title.textContent = fullProductData.name?.[currentLang] || fullProductData.name;
        title.style.cssText = `
          font-size: 1em;
          margin: 10px 0;
          min-height: 40px;
        `;

        // Add to cart form
        const form = document.createElement('form');
        form.id = `product-form-${fullProductData.id}`;

        // Hidden product ID input
        const productIdInput = document.createElement('input');
        productIdInput.type = 'hidden';
        productIdInput.name = 'product_id';
        productIdInput.value = fullProductData.id;

        // Quantity input
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.name = 'quantity';
        quantityInput.value = '1';
        quantityInput.min = '1';
        quantityInput.style.cssText = `
          width: 60px;
          padding: 5px;
          margin: 10px 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          text-align: center;
        `;

        // Add to cart button
        const addButton = document.createElement('button');
        addButton.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
        addButton.type = 'button';
        addButton.style.cssText = `
          width: 100%;
          padding: 8px 15px;
          background: var(--theme-primary, #00b286);
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          transition: opacity 0.3s;
        `;

        // Handle add to cart
        addButton.addEventListener('click', () => {
          zid.store.cart.addProduct({ formId: form.id })
            .then(response => {
              if (response.status === 'success' && typeof setCartBadge === 'function') {
                setCartBadge(response.data.cart.products_count);
              }
            })
            .catch(error => console.error('Add to cart error:', error));
        });

        // Assemble form
        form.appendChild(productIdInput);
        form.appendChild(quantityInput);
        form.appendChild(addButton);

        // Assemble card
        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(form);

        return card;
      } catch (error) {
        console.error('Error creating product card:', error);
        return null;
      }
    },

    async showUpsellModal(campaign, productCart) {
      console.log('Showing upsell modal:', campaign);
      
      if (!campaign?.upsellProducts?.length) {
        console.warn('Invalid campaign data:', campaign);
        return;
      }

      try {
        if (this.currentModal) {
          this.currentModal.remove();
        }

        const currentLang = getCurrentLanguage();
        const isRTL = currentLang === 'ar';

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'hmstudio-upsell-modal';

        // Create content container
        const content = document.createElement('div');
        content.className = 'hmstudio-upsell-content';
        content.style.direction = isRTL ? 'rtl' : 'ltr';

        // Create header
        const header = document.createElement('div');
        header.className = 'hmstudio-upsell-header';

        const title = document.createElement('h2');
        title.className = 'hmstudio-upsell-title';
        title.textContent = currentLang === 'ar' ? campaign.textSettings.titleAr : campaign.textSettings.titleEn;

        const subtitle = document.createElement('p');
        subtitle.className = 'hmstudio-upsell-subtitle';
        subtitle.textContent = currentLang === 'ar' ? campaign.textSettings.subtitleAr : campaign.textSettings.subtitleEn;

        header.appendChild(title);
        header.appendChild(subtitle);

        // Create main content wrapper
        const mainWrapper = document.createElement('div');
        mainWrapper.className = 'hmstudio-upsell-main';

        // Create sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'hmstudio-upsell-sidebar';

        // Create "Add All to Cart" button
        const addAllButton = document.createElement('button');
        addAllButton.className = 'hmstudio-add-all-btn';
        addAllButton.textContent = currentLang === 'ar' ? 'أضف الكل إلى السلة' : 'Add All to Cart';

        addAllButton.addEventListener('click', async () => {
          const forms = content.querySelectorAll('form');
          for (const form of forms) {
            await zid.store.cart.addProduct({ formId: form.id })
              .then(response => {
                if (response.status === 'success' && typeof setCartBadge === 'function') {
                  setCartBadge(response.data.cart.products_count);
                }
              })
              .catch(error => console.error('Add to cart error:', error));
          }
          this.closeModal();
        });

        sidebar.appendChild(addAllButton);

        // Create products grid
        const productsGrid = document.createElement('div');
        productsGrid.className = 'hmstudio-upsell-products';

        // Create and append product cards
        const productCards = await Promise.all(
          campaign.upsellProducts.map(product => this.createProductCard(product))
        );

        productCards.filter(Boolean).forEach(card => {
          productsGrid.appendChild(card);
        });

        // Create close button
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

        // Assemble modal
        mainWrapper.appendChild(sidebar);
        mainWrapper.appendChild(productsGrid);

        content.appendChild(closeButton);
        content.appendChild(header);
        content.appendChild(mainWrapper);
        modal.appendChild(content);

        // Add modal to document
        document.body.appendChild(modal);

        // Handle click outside to close
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeModal();
          }
        });

        // Handle escape key
        const handleEscape = (e) => {
          if (e.key === 'Escape') {
            this.closeModal();
          }
        };
        document.addEventListener('keydown', handleEscape);

        // Clean up event listener when modal is removed
        modal.addEventListener('remove', () => {
          document.removeEventListener('keydown', handleEscape);
        });

        this.currentModal = modal;

      } catch (error) {
        console.error('Error showing upsell modal:', error);
      }
    },

   closeModal() {
      if (this.currentModal) {
        const content = this.currentModal.querySelector('.hmstudio-upsell-content');
        
        // Add fade-out animation
        this.currentModal.style.opacity = '0';
        if (content) {
          content.style.transform = 'translateY(20px)';
        }

        // Remove modal after animation
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
      
      // Create global object for external access
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

      // Handle visibility changes
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

      // Add swipe to close on mobile
      this.initializeMobileSwipe();
    },

    initializeMobileSwipe() {
      let touchStartY = 0;
      let touchMoveY = 0;

      const handleTouchStart = (e) => {
        touchStartY = e.touches[0].clientY;
      };

      const handleTouchMove = (e) => {
        if (!this.currentModal) return;
        
        touchMoveY = e.touches[0].clientY;
        const diff = touchMoveY - touchStartY;
        
        // Only allow downward swipe
        if (diff > 0) {
          const content = this.currentModal.querySelector('.hmstudio-upsell-content');
          if (content) {
            content.style.transform = `translateY(${diff}px)`;
            e.preventDefault();
          }
        }
      };

      const handleTouchEnd = () => {
        if (!this.currentModal) return;

        const diff = touchMoveY - touchStartY;
        const content = this.currentModal.querySelector('.hmstudio-upsell-content');
        
        if (diff > 100) { // If swipe is long enough, close modal
          this.closeModal();
        } else if (content) { // Otherwise, snap back
          content.style.transform = 'translateY(0)';
        }

        // Reset values
        touchStartY = 0;
        touchMoveY = 0;
      };

      // Add event listeners
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
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
