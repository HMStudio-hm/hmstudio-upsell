// src/scripts/upsell.js v1.9.2
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

    formatPrice(price, currentLang) {
      if (!price) return currentLang === 'ar' ? '0 ر.س' : 'SAR 0.00';
      
      try {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        const formattedPrice = numPrice.toFixed(2);
        
        return currentLang === 'ar' 
          ? `${formattedPrice} ر.س`
          : `SAR ${formattedPrice}`;
      } catch (error) {
        console.error('Error formatting price:', error);
        return currentLang === 'ar' ? '0 ر.س' : 'SAR 0.00';
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

        // Main content wrapper
        const mainWrapper = document.createElement('div');
        mainWrapper.style.cssText = `
          display: flex;
          gap: 30px;
          align-items: flex-start;
        `;

        // Products grid
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

            // Variants selector if available
            const variantSelect = document.createElement('select');
            variantSelect.style.cssText = `
              width: 100%;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
              margin-bottom: 10px;
              font-size: 13px;
            `;

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

            // Price display
            const price = document.createElement('div');
            price.textContent = this.formatPrice(productData.price, currentLang);
            price.style.cssText = `
              font-weight: bold;
              font-size: 14px;
              margin: 8px 0;
            `;

            // Add to Cart button
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

            // Assemble product card
            quantityWrapper.appendChild(decreaseBtn);
            quantityWrapper.appendChild(quantityInput);
            quantityWrapper.appendChild(increaseBtn);
            quantityContainer.appendChild(quantityLabel);
            quantityContainer.appendChild(quantityWrapper);

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

        // Add "Add all products" button section
        const actionSection = document.createElement('div');
        actionSection.style.cssText = `
          width: 250px;
          flex-shrink: 0;
          padding: 20px;
          position: sticky;
          top: 20px;
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

        // Add all products functionality
        addAllButton.addEventListener('click', async () => {
          for (const product of campaign.upsellProducts) {
            try {
              await zid.store.cart.addProduct({
                data: {
                  product_id: product.id,
                  quantity: 1
                }
              });
            } catch (error) {
              console.error('Error adding product to cart:', error);
            }
          }
          
          // Close modal after adding all products
          this.closeModal();
        });

        actionSection.appendChild(addAllButton);

        // Assemble main layout
        mainWrapper.appendChild(productsGrid);
        mainWrapper.appendChild(actionSection);

        // Assemble modal
        content.appendChild(closeButton);
        content.appendChild(header);
        content.appendChild(mainWrapper);
        modal.appendChild(content);

        // Add to DOM
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

      // Extend Zid's cart.addProduct to show upsell modal
      if (typeof zid !== 'undefined' && zid.store && zid.store.cart) {
        const originalAddProduct = zid.store.cart.addProduct;
        zid.store.cart.addProduct = async function(...args) {
          try {
            const result = await originalAddProduct.apply(this, args);
            
            if (result.status === 'success') {
              // Get the product data from the cart response
              const addedProduct = result.data.cart.products[result.data.cart.products.length - 1];
              
              if (addedProduct) {
                // Find matching campaign
                const matchingCampaign = UpsellManager.campaigns.find(campaign => 
                  campaign.triggerProducts && 
                  Array.isArray(campaign.triggerProducts) &&
                  campaign.triggerProducts.some(p => p.id === addedProduct.product_id) &&
                  campaign.status === 'active'
                );

                if (matchingCampaign) {
                  setTimeout(() => {
                    UpsellManager.showUpsellModal(matchingCampaign, addedProduct);
                  }, 500); // Small delay to allow cart animation to complete
                }
              }
            }
            
            return result;
          } catch (error) {
            console.error('Error in cart add:', error);
            throw error;
          }
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
