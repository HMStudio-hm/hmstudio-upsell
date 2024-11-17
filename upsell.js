async productAddToCart(formId, progressElement) {
      try {
        const form = document.getElementById(formId);
        const formData = new FormData(form);
        console.log('Adding to cart:', {
          formId,
          productId: formData.get('product_id'),
          quantity: formData.get('quantity')
        });

        const response = await zid.store.cart.addProduct({ 
          formId: formId
        });

        console.log('Cart response:', response);

        if (response.status === 'success') {
          if (typeof setCartBadge === 'function') {
            setCartBadge(response.data.cart.products_count);
          }
          if (typeof updateMiniCart === 'function') {
            updateMiniCart();
          }
        } else {
          console.error('Add to cart failed:', response);
          const errorMessage = getCurrentLanguage() === 'ar' 
            ? response.data?.message || 'فشل إضافة المنتج إلى السلة'
            : response.data?.message || 'Failed to add product to cart';
          alert(errorMessage);
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        const errorMessage = getCurrentLanguage() === 'ar' 
          ? 'حدث خطأ أثناء إضافة المنتج إلى السلة'
          : 'Error occurred while adding product to cart';
        alert(errorMessage);
      } finally {
        if (progressElement) {
          progressElement.classList.add('d-none');
        }
      }
    },

    closeModal() {
      if (this.currentModal) {
        this.currentModal.style.opacity = '0';
        this.currentModal.querySelector('.hmstudio-upsell-content').style.transform = 'translateY(20px)';
        setTimeout(() => {
          this.currentModal.remove();
          this.currentModal = null;
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

      // Handle custom close events (e.g., from navigation)
      document.addEventListener('routeChange', () => {
        if (this.currentModal) {
          this.closeModal();
        }
      });

      // Close modal on back button press
      window.addEventListener('popstate', () => {
        if (this.currentModal) {
          this.closeModal();
        }
      });

      // Add keyframe animation for spinner
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .add-to-cart-progress {
          animation: spin 1s linear infinite;
        }

        .hmstudio-upsell-modal {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                       Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 
                       'Helvetica Neue', sans-serif;
        }

        .hmstudio-upsell-modal input[type="number"]::-webkit-inner-spin-button,
        .hmstudio-upsell-modal input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .hmstudio-upsell-modal input[type="number"] {
          -moz-appearance: textfield;
        }

        .variant-select {
          direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
        }

        .product-price {
          display: inline-block;
          direction: ltr;
        }

        .product-old-price {
          display: inline-block;
          direction: ltr;
        }
      `;
      document.head.appendChild(styleSheet);

      // Add RTL stylesheet if needed
      if (getCurrentLanguage() === 'ar') {
        const rtlStyles = document.createElement('style');
        rtlStyles.textContent = `
          .hmstudio-upsell-modal {
            direction: rtl;
          }
          
          .hmstudio-upsell-modal .add-to-cart-progress {
            margin-right: 8px;
            margin-left: 0;
          }

          .hmstudio-upsell-modal .variant-select {
            text-align: right;
          }
        `;
        document.head.appendChild(rtlStyles);
      }

      // Handle Zid product variants script
      window.productOptionsChanged = (selected_product) => {
        if (selected_product) {
          const form = document.querySelector('#product-form');
          if (form) {
            const productIdInput = form.querySelector('#product-id');
            if (productIdInput) {
              productIdInput.value = selected_product.id;
            }

            const addButton = form.querySelector('.btn-primary');
            if (addButton) {
              if (!selected_product.unavailable) {
                addButton.disabled = false;
                addButton.style.opacity = '1';
              } else {
                addButton.disabled = true;
                addButton.style.opacity = '0.5';
              }
            }
          }
        }
      };

      // Set up mutation observer to handle dynamic content changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && this.currentModal) {
            const modalStillExists = document.contains(this.currentModal);
            if (!modalStillExists) {
              this.currentModal = null;
            }
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
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
