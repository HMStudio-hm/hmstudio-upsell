// src/scripts/upsell.js v1.4.6
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
      // Simple base64 decode and parse
      const decodedData = atob(campaignsData);
      return JSON.parse(decodedData);
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
          z-index: 1;
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
          font-weight: bold;
          color: #333;
          margin: 0 0 10px;
          line-height: 1.3;
          font-family: ${isRTL ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' : 'inherit'};
        `;

        // Subtitle (if available)
        const subtitle = currentLang === 'ar' ? campaign.subtitleAr : campaign.subtitleEn;
        if (subtitle) {
          const subtitleEl = document.createElement('p');
          subtitleEl.textContent = subtitle;
          subtitleEl.style.cssText = `
            font-size: 1.1em;
            color: #666;
            margin: 0;
            line-height: 1.4;
            font-family: ${isRTL ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' : 'inherit'};
          `;
          headerSection.appendChild(subtitleEl);
        }

        headerSection.appendChild(mainTitle);
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

    async createProductsGrid(products) {
      const productsGrid = document.createElement('div');
      productsGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 20px;
      `;

      const productCards = await Promise.all(
        products.map(product => this.createProductCard(product))
      );

      productCards.filter(card => card !== null).forEach(card => {
        productsGrid.appendChild(card);
      });

      return productsGrid;
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
      if (!window.HMStudioUpsell) {
        window.HMStudioUpsell = {
          showUpsellModal: (...args) => this.showUpsellModal.apply(this, args),
          closeModal: () => this.closeModal()
        };
      }

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
