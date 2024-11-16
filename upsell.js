// src/scripts/upsell.js v1.0.1
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
      console.log('Raw campaigns data:', campaignsData); // Add this

      if (!campaignsData) {
        console.log('No campaigns data found in URL');
        return [];
      }
  
      try {
        const decodedData = atob(campaignsData);
        const parsedData = JSON.parse(decodedData);
        console.log('Parsed campaigns data:', parsedData); // Add this
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
  
      createUpsellModal(campaign, triggerProduct) {
        const currentLang = getCurrentLanguage();
        const isRTL = currentLang === 'ar';
  
        // Remove existing modal if any
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
        title.textContent = isRTL ? 'عروض خاصة لك!' : 'Special Offers for You!';
  
        // Products grid
        const productsGrid = document.createElement('div');
        productsGrid.style.cssText = `
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 20px;
        `;
  
        // Add upsell products
        campaign.upsellProducts.forEach(product => {
          const productCard = this.createProductCard(product);
          productsGrid.appendChild(productCard);
        });
  
        // Assemble modal
        content.appendChild(closeButton);
        content.appendChild(title);
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
      },
  
      createProductCard(product) {
        const currentLang = getCurrentLanguage();
        const card = document.createElement('div');
        card.className = 'hmstudio-upsell-product-card';
        card.style.cssText = `
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
  
        card.innerHTML = `
          <img 
            src="${product.thumbnail}" 
            alt="${product.name}" 
            style="width: 100%; height: 150px; object-fit: contain; margin-bottom: 10px;"
          >
          <h4 style="font-size: 1em; margin: 10px 0; min-height: 40px;">
            ${product.name}
          </h4>
          <button 
            class="hmstudio-upsell-add-to-cart"
            style="
              background: var(--theme-primary, #00b286);
              color: white;
              border: none;
              padding: 8px 15px;
              border-radius: 4px;
              cursor: pointer;
              width: 100%;
              transition: opacity 0.2s;
            "
          >
            ${currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart'}
          </button>
        `;
  
        // Hover effects
        card.addEventListener('mouseover', () => {
          card.style.transform = 'translateY(-5px)';
          card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
  
        card.addEventListener('mouseout', () => {
          card.style.transform = 'translateY(0)';
          card.style.boxShadow = 'none';
        });
  
        // Add to cart functionality
        const addButton = card.querySelector('.hmstudio-upsell-add-to-cart');
        addButton.addEventListener('click', () => this.addToCart(product));
  
        return card;
      },
  
      async addToCart(product) {
        try {
          const response = await zid.store.cart.addProduct({
            data: {
              product_id: product.id,
              quantity: 1
            }
          });
  
          if (response.status === 'success') {
            if (typeof setCartBadge === 'function') {
              setCartBadge(response.data.cart.products_count);
            }
          }
        } catch (error) {
          console.error('Error adding upsell product to cart:', error);
        }
      },
  
      closeModal() {
        if (this.currentModal) {
          this.currentModal.style.opacity = '0';
          setTimeout(() => {
            this.currentModal.remove();
            this.currentModal = null;
          }, 300);
        }
      },
  
      findMatchingCampaign(productId) {
        return this.campaigns.find(campaign => 
          campaign.triggerProducts.some(p => p.id === productId) &&
          campaign.status === 'active'
        );
      },
  
      handleAddToCart(productData) {
        console.log('Product added to cart:', productData); // Add this
    console.log('Available campaigns:', this.campaigns); // Add this

        // Clear any existing timeout
        if (this.activeTimeout) {
          clearTimeout(this.activeTimeout);
        }
  
        const matchingCampaign = this.findMatchingCampaign(productData.id);
        console.log('Matching campaign found:', matchingCampaign); // Add this
        if (matchingCampaign) {
          // Small delay to show upsell after cart animation
          this.activeTimeout = setTimeout(() => {
            console.log('Creating upsell modal for campaign:', matchingCampaign); // Add this

            this.createUpsellModal(matchingCampaign, productData);
          }, 500);
        }
      },
  
      initialize() {
        console.log('Initializing Upsell with campaigns:', this.campaigns);
  
        // Listen for add to cart events
        const originalAddProduct = zid.store.cart.addProduct;
        zid.store.cart.addProduct = async function(...args) {
          console.log('Add to cart triggered with args:', args); // Add this

          try {
            const result = await originalAddProduct.apply(zid.store.cart, args);
            console.log('Add to cart result:', result); // Add this
            if (result.status === 'success') {
              const productId = args[0]?.data?.product_id;
              console.log('Product ID extracted:', productId); // Add this
              if (productId) {
                UpsellManager.handleAddToCart({ id: productId });
              }
            }
            return result;
          } catch (error) {
            console.error('Error in cart add:', error);
            throw error;
          }
        };
  
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
          if (document.hidden && this.currentModal) {
            this.closeModal();
          }
        });
  
        // Handle window resize
        window.addEventListener('resize', () => {
          if (this.currentModal) {
            // Adjust modal positioning if needed
            const content = this.currentModal.querySelector('.hmstudio-upsell-content');
            if (content) {
              content.style.maxHeight = `${window.innerHeight * 0.9}px`;
            }
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
