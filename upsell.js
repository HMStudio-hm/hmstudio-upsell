// src/scripts/upsell.js v2.0.3
// HMStudio Upsell Feature

(function() {
console.log('Upsell script initialized');

// Previous helper functions remain the same...
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

function isMobileDevice() {
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
      card.style.cssText = `
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: ${isRTL ? 'row-reverse' : 'row'};
        align-items: center;
        gap: 15px;
        background: white;
        width: 100%;
        max-width: 400px;
      `;

      // Create form with proper structure for Zid API
      const form = document.createElement('form');
      form.id = `product-form-${fullProductData.id}`;
      form.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      `;

      // Product ID input
      const productIdInput = document.createElement('input');
      productIdInput.type = 'hidden';
      productIdInput.id = 'product-id';
      productIdInput.name = 'product_id';
      productIdInput.value = fullProductData.selected_product?.id || fullProductData.id;
      form.appendChild(productIdInput);

      // Product image container
      const imageContainer = document.createElement('div');
      imageContainer.style.cssText = `
        width: 80px;
        height: 80px;
        flex-shrink: 0;
      `;

      const productImage = document.createElement('img');
      productImage.src = fullProductData.images?.[0]?.url || product.thumbnail;
      productImage.alt = productName;
      productImage.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 4px;
      `;
      imageContainer.appendChild(productImage);

      // Product info container
      const infoContainer = document.createElement('div');
      infoContainer.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      `;

      // Product name
      const nameElement = document.createElement('h4');
      nameElement.textContent = productName;
      nameElement.style.cssText = `
        font-size: 0.9em;
        margin: 0;
        font-weight: 600;
        color: #333;
      `;
      infoContainer.appendChild(nameElement);

      // Price display
      const priceContainer = document.createElement('div');
      priceContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 4px 0;
      `;

      const currentPrice = document.createElement('span');
      currentPrice.className = 'product-price';
      currentPrice.style.cssText = `
        font-weight: bold;
        color: var(--theme-primary, #00b286);
        font-size: 0.9em;
      `;

      const oldPrice = document.createElement('span');
      oldPrice.className = 'product-old-price';
      oldPrice.style.cssText = `
        text-decoration: line-through;
        color: #999;
        font-size: 0.8em;
        margin-${isRTL ? 'right' : 'left'}: 8px;
        display: none;
      `;

      const currencySymbol = currentLang === 'ar' ? 'ر.س' : 'SAR';

      if (fullProductData.formatted_sale_price) {
        currentPrice.textContent = fullProductData.formatted_sale_price.replace('SAR', currencySymbol);
        oldPrice.textContent = fullProductData.formatted_price.replace('SAR', currencySymbol);
        oldPrice.style.display = 'inline';
      } else {
        currentPrice.textContent = fullProductData.formatted_price.replace('SAR', currencySymbol);
      }

      priceContainer.appendChild(currentPrice);
      priceContainer.appendChild(oldPrice);
      infoContainer.appendChild(priceContainer);

      // Controls container
      const controlsContainer = document.createElement('div');
      controlsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;
      `;

      // Variants section
      if (fullProductData.has_options && fullProductData.variants?.length > 0) {
        const variantsSection = this.createVariantsSection(fullProductData, currentLang);
        controlsContainer.appendChild(variantsSection);
      }

      // Quantity selector
      const quantityContainer = document.createElement('div');
      quantityContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      const decrementBtn = document.createElement('button');
      decrementBtn.type = 'button';
      decrementBtn.textContent = '-';
      decrementBtn.style.cssText = `
        width: 24px;
        height: 24px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      `;

      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.name = 'quantity';
      quantityInput.min = '1';
      quantityInput.value = '1';
      quantityInput.style.cssText = `
        width: 40px;
        padding: 4px;
        border: 1px solid #ddd;
        border-radius: 4px;
        text-align: center;
        font-size: 0.9em;
      `;

      const incrementBtn = document.createElement('button');
      incrementBtn.type = 'button';
      incrementBtn.textContent = '+';
      incrementBtn.style.cssText = decrementBtn.style.cssText;

      decrementBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
          quantityInput.value = (currentValue - 1).toString();
        }
      });

      incrementBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        quantityInput.value = (currentValue + 1).toString();
      });

      quantityContainer.appendChild(decrementBtn);
      quantityContainer.appendChild(quantityInput);
      quantityContainer.appendChild(incrementBtn);

      // Add to cart button
      const addButton = document.createElement('button');
      addButton.className = 'btn btn-primary add-to-cart-btn';
      addButton.type = 'button';
      addButton.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
      addButton.style.cssText = `
        background: transparent;
        color: var(--theme-primary, #00b286);
        border: 1px solid var(--theme-primary, #00b286);
        border-radius: 20px;
        padding: 6px 16px;
        font-size: 0.85em;
        cursor: pointer;
        width: fit-content;
        transition: all 0.3s;
      `;

      addButton.addEventListener('mouseover', () => {
        addButton.style.backgroundColor = 'var(--theme-primary, #00b286)';
        addButton.style.color = 'white';
      });

      addButton.addEventListener('mouseout', () => {
        addButton.style.backgroundColor = 'transparent';
        addButton.style.color = 'var(--theme-primary, #00b286)';
      });

      const spinner = document.createElement('div');
      spinner.className = 'add-to-cart-progress d-none';
      spinner.style.cssText = `
        width: 16px;
        height: 16px;
        border: 2px solid currentColor;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-left: 8px;
        display: none;
      `;
      addButton.appendChild(spinner);

      // Add to cart handler
      addButton.addEventListener('click', function() {
        if (fullProductData.has_options && fullProductData.variants?.length > 0) {
          const selectedVariants = {};
          const missingSelections = [];
          
          form.querySelectorAll('.variant-select').forEach(select => {
            const labelText = select.previousElementSibling.textContent;
            if (!select.value) {
              missingSelections.push(labelText);
            }
            selectedVariants[labelText] = select.value;
          });

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
          }
          spinners.forEach(s => s.classList.add('d-none'));
        }).catch(function(error) {
          console.error('Add to cart error:', error);
          spinners.forEach(s => s.classList.add('d-none'));
        });
      });

      controlsContainer.appendChild(quantityContainer);
      controlsContainer.appendChild(addButton);
      infoContainer.appendChild(controlsContainer);

      if (isRTL) {
        card.appendChild(form);
        card.appendChild(imageContainer);
      } else {
        card.appendChild(imageContainer);
        card.appendChild(form);
      }
      form.appendChild(infoContainer);

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
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
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
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.85em;
          background: white;
          max-width: 120px;
        `;

        const labelText = currentLang === 'ar' ? attr.slug : attr.name;
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
        const labelText = select.previousElementSibling?.textContent || select.querySelector('option[value=""]').textContent.replace(/^اختر |^Select /, '');
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
      const currencySymbol = currentLang === 'ar' ? 'ر.س' : 'SAR';

      if (priceElement) {
        if (selectedVariant.formatted_sale_price) {
          priceElement.textContent = selectedVariant.formatted_sale_price.replace('SAR', currencySymbol);
          if (oldPriceElement) {
            oldPriceElement.textContent = selectedVariant.formatted_price.replace('SAR', currencySymbol);
            oldPriceElement.style.display = 'inline';
          }
        } else {
          priceElement.textContent = selectedVariant.formatted_price.replace('SAR', currencySymbol);
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
        padding: ${isMobileDevice() ? '20px' : '30px'};
        border-radius: 12px;
        width: ${isMobileDevice() ? '90%' : '600px'};
        max-width: 90%;
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
        ${isRTL ? 'right' : 'left'}: 15px;
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
      const header = document.createElement('div');
      header.style.cssText = `
        text-align: center;
        margin-bottom: 20px;
      `;

      const title = document.createElement('h2');
      title.textContent = currentLang === 'ar' ? decodeURIComponent(campaign.textSettings.titleAr) : campaign.textSettings.titleEn;
      title.style.cssText = `
        font-size: 1.5em;
        margin-bottom: 8px;
        color: #333;
      `;

      const subtitle = document.createElement('p');
      subtitle.textContent = currentLang === 'ar' ? decodeURIComponent(campaign.textSettings.subtitleAr) : campaign.textSettings.subtitleEn;
      subtitle.style.cssText = `
        font-size: 1em;
        color: #666;
        margin: 0;
      `;

      header.appendChild(title);
      header.appendChild(subtitle);

      // Products container
      const productsContainer = document.createElement('div');
      productsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 15px;
        margin: 20px 0;
      `;

      // Create product cards
      const productCards = await Promise.all(
        campaign.upsellProducts.map(async (product) => {
          return await this.createProductCard(product);
        })
      );

      productCards.filter(card => card !== null).forEach(card => {
        productsContainer.appendChild(card);
      });

      // Add All to Cart button container
      const addAllContainer = document.createElement('div');
      addAllContainer.style.cssText = `
        display: flex;
        justify-content: center;
        margin-top: 20px;
      `;

      // Add All to Cart button
      const addAllButton = document.createElement('button');
      addAllButton.textContent = currentLang === 'ar' ? 'أضف الكل إلى السلة' : 'Add All to Cart';
      addAllButton.style.cssText = `
        background: var(--theme-primary, #00b286);
        color: white;
        border: none;
        border-radius: 20px;
        padding: 8px 24px;
        font-size: 0.9em;
        cursor: pointer;
        transition: opacity 0.3s;
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
      });

      addAllContainer.appendChild(addAllButton);

      // Assemble modal
      content.appendChild(closeButton);
      content.appendChild(header);
      content.appendChild(productsContainer);
      content.appendChild(addAllContainer);
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

