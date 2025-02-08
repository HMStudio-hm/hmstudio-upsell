// src/scripts/upsell.js v2.4.8
// HMStudio Upsell Feature
// the logs and comments cleaned up version(from v2.4.7 last and not logs cleaned up)


;(() => {
  const styleTag = document.createElement("style")
  styleTag.textContent = `
  @font-face {font-family: "Teshrin AR+LT Bold"; src: url("//db.onlinewebfonts.com/t/56364258e3196484d875eec94e6edb93.eot"); 
src: url("//db.onlinewebfonts.com/t/56364258e3196484d875eec94e6edb93.eot?#iefix") format("embedded-opentype"), url("//db.onlinewebfonts.com/t/56364258e3196484d875eec94e6edb93.woff2") format("woff2"), url("//db.onlinewebfonts.com/t/56364258e3196484d875eec94e6edb93.woff") format("woff"), url("//db.onlinewebfonts.com/t/56364258e3196484d875eec94e6edb93.ttf") format("truetype"), url("//db.onlinewebfonts.com/t/56364258e3196484d875eec94e6edb93.svg#Teshrin AR+LT Bold") format("svg"); 
}
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
      opacity: 0;
      transition: opacity 0.3s ease;
    }
  
    .hmstudio-upsell-content {
      background: white;
      padding: 40px;
      border-radius: 12px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      transform: translateY(20px);
      transition: transform 0.3s ease;
    }
  
    .hmstudio-upsell-content:has(.hmstudio-upsell-products > *:only-child) {
      max-width: 620px;
    }

    .hmstudio-upsell-content:has(.hmstudio-upsell-products > *:first-child:nth-last-child(2)) {
      max-width: 750px;
    }

    .hmstudio-upsell-content:has(.hmstudio-upsell-products > *:first-child:nth-last-child(3)) {
      max-width: 1000px;
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
      margin: 0;
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
      grid-template-columns: repeat(auto-fit, 180px);
      gap: 20px;
      justify-content: center;
      width: 100%;
      margin: 0 auto;
    }
  
    .hmstudio-upsell-product-card {
      border: 1px solid #eee;
      box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2) !important;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
  
    .hmstudio-upsell-product-form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  
    .hmstudio-upsell-product-image-container {
      width: 100%;
      margin-bottom: 15px;
    }
  
    .hmstudio-upsell-product-image {
      width: 100%;
      height: 150px;
      object-fit: contain;
      margin-bottom: 10px;
    }
  
    .hmstudio-upsell-product-content {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  
    .hmstudio-upsell-product-title {
      font-size: 16px;
      font-weight: 500;
      color: #333;
      margin: 0;
      min-height: 40px;
      text-align: center;
    }
  
    .hmstudio-upsell-product-price {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--theme-primary, #00b286);
      font-weight: bold;
      justify-content: center;
      margin-bottom: 5px;
    }
  
    .hmstudio-upsell-variants {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      margin: 5px 0;
    }
  
    .hmstudio-upsell-variants select {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      color: #333;
    }
  
    .hmstudio-upsell-variants label {
      font-size: 14px;
      color: #666;
      margin-bottom: 4px;
    }
  
    .hmstudio-upsell-product-controls {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 5px;
    }
  
    .hmstudio-upsell-product-quantity {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin: 10px auto;
      border: 1px solid #ddd;
      border-radius: 20px;
      padding: 2px;
      width: fit-content;
    }
  
    .hmstudio-upsell-quantity-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: #666;
      padding: 0;
    }
  
    .hmstudio-upsell-product-quantity input {
      width: 40px;
      border: none;
      text-align: center;
      font-size: 14px;
      padding: 0;
      -moz-appearance: textfield;
      background: transparent;
    }
  
    .hmstudio-upsell-product-quantity input::-webkit-outer-spin-button,
    .hmstudio-upsell-product-quantity input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  
    .addToCartBtn {
      width: 100%;
      padding: 8px 15px;
      background: var(--theme-primary, #00b286);
      color: white;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      transition: opacity 0.3s;
      font-size: 14px;
    }
  
    .addToCartBtn:hover {
      opacity: 0.9;
    }
  
    @media (max-width: 768px) {
      .hmstudio-upsell-content {
        padding: 20px;
        width: 100%;
        height: 100vh;
        border-radius: 0;
        margin: 0;
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
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        order: 1;
      }
  
      .hmstudio-upsell-title {
        font-size: 20px;
      }
  
      .hmstudio-upsell-subtitle {
        font-size: 14px;
      }
    }
  
    @media (max-width: 480px) {
      .hmstudio-upsell-content {
        padding: 20px;
        width: 100%;
        height: 100vh;
        border-radius: 15px;
        margin: 10px;
      }
  
      .hmstudio-upsell-products {
        flex-direction: column;
        align-items: center !important;
        display: flex !important;
      }
  
      .hmstudio-upsell-product-card {
        width: 100%;
        display: flex;
        padding: 10px;
      }
  
      .hmstudio-upsell-product-form {
        flex-direction: row;
        align-items: center !important;
        width: 100% !important;
        display: flex;
      }
  
      .hmstudio-upsell-product-image-container {
        width: 100px !important;
        height: 100px !important;
        overflow: unset !important;
        margin-bottom: 0;
        margin-right: 15px;
      }
  
      .hmstudio-upsell-product-image {
        height: 100%;
        margin-bottom: 0;
      }
  
      .hmstudio-upsell-product-content {
        flex: 1;
        gap: 8px;
        text-align: left;
      }
  
      .hmstudio-upsell-product-title {
        min-height: auto;
        font-size: 14px !important;
        text-align: start;
        margin-bottom: 0 !important;
      }
  
      .hmstudio-upsell-product-price {
        justify-content: flex-start !important;
        margin-top: 4px;
      }
  
      .hmstudio-upsell-variants {
        margin: 5px 0;
      }
  
      .hmstudio-upsell-variants select {
        padding: 6px;
        font-size: 12px;
      }
  
      .hmstudio-upsell-variants label {
        font-size: 12px;
        text-align: left;
      }
  
      .hmstudio-upsell-product-controls {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 8px;
      }
  
      .hmstudio-upsell-product-quantity {
        margin: 0;
      }
  
      .addToCartBtn {
        flex: 1;
        max-width: 120px;
        padding: 6px 12px;
        font-size: 12px;
      }
    }
  `

  document.head.appendChild(styleTag)

  function getStoreIdFromUrl() {
    const scriptTag = document.currentScript
    const scriptUrl = new URL(scriptTag.src)
    const storeId = scriptUrl.searchParams.get("storeId")
    return storeId ? storeId.split("?")[0] : null
  }

  function getCampaignsFromUrl() {
    const scriptTag = document.currentScript
    const scriptUrl = new URL(scriptTag.src)
    const campaignsData = scriptUrl.searchParams.get("campaigns")

    if (!campaignsData) {
      return []
    }

    try {
      const decodedData = atob(campaignsData)
      const parsedData = JSON.parse(decodedData)

      return parsedData.map((campaign) => ({
        ...campaign,
        textSettings: {
          titleAr: campaign.textSettings?.titleAr || "",
          titleEn: campaign.textSettings?.titleEn || "",
          subtitleAr: campaign.textSettings?.subtitleAr || "",
          subtitleEn: campaign.textSettings?.subtitleEn || "",
        },
      }))
    } catch (error) {
      return []
    }
  }

  function getCurrentLanguage() {
    return document.documentElement.lang || "ar"
  }

  const storeId = getStoreIdFromUrl()
  if (!storeId) {
    return
  }

  const UpsellManager = {
    campaigns: getCampaignsFromUrl(),
    currentModal: null,
    activeTimeout: null,

    async fetchProductData(productId) {
      const url = `https://europe-west3-hmstudio-85f42.cloudfunctions.net/getProductData?storeId=${storeId}&productId=${productId}`

      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch product data: ${response.statusText}`)
        }
        const data = await response.json()
        return data
      } catch (error) {
        throw error
      }
    },

    async createProductCard(product, currentCampaign) {
      try {
        const fullProductData = await this.fetchProductData(product.id)

        if (!fullProductData) {
          throw new Error("Failed to fetch full product data")
        }

        const currentLang = getCurrentLanguage()
        const isRTL = currentLang === "ar"

        let productName = fullProductData.name
        if (typeof productName === "object") {
          productName = currentLang === "ar" ? productName.ar : productName.en
        }

        const card = document.createElement("div")
        card.className = "hmstudio-upsell-product-card"

        const form = document.createElement("form")
        form.id = `product-form-${fullProductData.id}`
        form.className = "hmstudio-upsell-product-form"

        const productIdInput = document.createElement("input")
        productIdInput.type = "hidden"
        productIdInput.id = "product-id"
        productIdInput.name = "product_id"
        productIdInput.value = fullProductData.selected_product?.id || fullProductData.id
        form.appendChild(productIdInput)

        const imageContainer = document.createElement("div")
        imageContainer.className = "hmstudio-upsell-product-image-container"

        const productImage = document.createElement("img")
        productImage.className = "hmstudio-upsell-product-image"
        productImage.src = fullProductData.images?.[0]?.url || product.thumbnail
        productImage.alt = productName
        imageContainer.appendChild(productImage)

        const contentContainer = document.createElement("div")
        contentContainer.className = "hmstudio-upsell-product-content"

        const title = document.createElement("h5")
        title.className = "hmstudio-upsell-product-title"
        title.textContent = productName
        contentContainer.appendChild(title)

        const priceContainer = document.createElement("div")
        priceContainer.className = "hmstudio-upsell-product-price"

        const currentPrice = document.createElement("span")
        const oldPrice = document.createElement("span")
        oldPrice.style.textDecoration = "line-through"
        oldPrice.style.color = "#999"
        oldPrice.style.fontSize = "0.9em"

        const currencySymbol = currentLang === "ar" ? "ر.س" : "SAR"

        if (fullProductData.formatted_sale_price) {
          const priceValue = fullProductData.formatted_sale_price.replace(" ر.س", "").replace("SAR", "").trim()
          const oldPriceValue = fullProductData.formatted_price.replace(" ر.س", "").replace("SAR", "").trim()

          currentPrice.textContent = isRTL ? `${priceValue} ${currencySymbol}` : `${currencySymbol} ${priceValue}`
          oldPrice.textContent = isRTL ? `${oldPriceValue} ${currencySymbol}` : `${currencySymbol} ${oldPriceValue}`
          priceContainer.appendChild(currentPrice)
          priceContainer.appendChild(oldPrice)
        } else {
          const priceValue = fullProductData.formatted_price.replace(" ر.س", "").replace("SAR", "").trim()
          currentPrice.textContent = isRTL ? `${priceValue} ${currencySymbol}` : `${currencySymbol} ${priceValue}`
          priceContainer.appendChild(currentPrice)
        }
        contentContainer.appendChild(priceContainer)

        if (fullProductData.has_options && fullProductData.variants?.length > 0) {
          const variantsSection = this.createVariantsSection(fullProductData, currentLang)
          variantsSection.className = "hmstudio-upsell-variants"
          contentContainer.appendChild(variantsSection)
        }

        const controlsContainer = document.createElement("div")
        controlsContainer.className = "hmstudio-upsell-product-controls"

        const quantityContainer = document.createElement("div")
        quantityContainer.className = "hmstudio-upsell-product-quantity"

        const quantityInput = document.createElement("input")
        quantityInput.type = "number"
        quantityInput.id = "product-quantity"
        quantityInput.name = "quantity"
        quantityInput.min = "1"
        quantityInput.value = "1"
        quantityInput.style.cssText = "text-align: center; width: 40px; border: none; background: transparent;"

        const decreaseBtn = document.createElement("button")
        decreaseBtn.className = "hmstudio-upsell-quantity-btn"
        decreaseBtn.type = "button"
        decreaseBtn.textContent = "-"

        const increaseBtn = document.createElement("button")
        increaseBtn.className = "hmstudio-upsell-quantity-btn"
        increaseBtn.type = "button"
        increaseBtn.textContent = "+"

        decreaseBtn.addEventListener("click", () => {
          const currentValue = Number.parseInt(quantityInput.value)
          if (currentValue > 1) {
            quantityInput.value = currentValue - 1
            const event = new Event("change", { bubbles: true })
            quantityInput.dispatchEvent(event)
          }
        })

        increaseBtn.addEventListener("click", () => {
          const currentValue = Number.parseInt(quantityInput.value)
          quantityInput.value = currentValue + 1
          const event = new Event("change", { bubbles: true })
          quantityInput.dispatchEvent(event)
        })

        quantityInput.addEventListener("keydown", (e) => {
          e.preventDefault()
        })

        quantityContainer.appendChild(decreaseBtn)
        quantityContainer.appendChild(quantityInput)
        quantityContainer.appendChild(increaseBtn)
        controlsContainer.appendChild(quantityContainer)

        const addToCartBtn = document.createElement("button")
        addToCartBtn.className = "addToCartBtn"
        addToCartBtn.type = "button"
        const originalText = currentLang === "ar" ? "إضافة للسلة" : "Add to Cart"
        const loadingText = currentLang === "ar" ? "جاري الإضافة..." : "Adding..."
        addToCartBtn.textContent = originalText

        addToCartBtn.addEventListener("click", () => {
          try {
            if (fullProductData.has_options && fullProductData.variants?.length > 0) {
              const selects = form.querySelectorAll(".variant-select")
              const missingSelections = []

              selects.forEach((select) => {
                const labelText = select.previousElementSibling.textContent
                if (!select.value) {
                  missingSelections.push(labelText)
                }
              })

              if (missingSelections.length > 0) {
                const message =
                  currentLang === "ar"
                    ? `الرجاء اختيار ${missingSelections.join(", ")}`
                    : `Please select ${missingSelections.join(", ")}`
                alert(message)
                return
              }
            }

            const quantityValue = Number.parseInt(quantityInput.value)
            if (isNaN(quantityValue) || quantityValue < 1) {
              const message = currentLang === "ar" ? "الرجاء إدخال كمية صحيحة" : "Please enter a valid quantity"
              alert(message)
              return
            }

            addToCartBtn.textContent = loadingText
            addToCartBtn.disabled = true
            addToCartBtn.style.opacity = "0.7"

            // Assuming 'zid' is available globally or through a proper import.  If not, you'll need to adjust this line.
            zid.store.cart
              .addProduct({
                formId: form.id,
              })
              .then((response) => {
                if (response.status === "success") {
                  if (typeof setCartBadge === "function") {
                    setCartBadge(response.data.cart.products_count)
                  }

                  try {
                    const quantityInput = form.querySelector("#product-quantity")
                    const quantity = Number.parseInt(quantityInput.value) || 1
                    const productId = form.querySelector('input[name="product_id"]').value
                    const productName = form.querySelector(".hmstudio-upsell-product-title").textContent
                    const priceElement = form.querySelector(".hmstudio-upsell-product-price")
                    const priceText = priceElement.textContent.replace(/[^0-9.]/g, "")
                    const price = Number.parseFloat(priceText) || 0

                    fetch("https://europe-west3-hmstudio-85f42.cloudfunctions.net/trackUpsellStats", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        storeId,
                        eventType: "cart_add",
                        productId,
                        productName,
                        quantity,
                        price,
                        campaignId: currentCampaign.id,
                        campaignName: currentCampaign.name,
                        timestamp: new Date().toISOString(),
                      }),
                    }).catch((error) => {})
                  } catch (error) {}
                } else {
                  const errorMessage =
                    currentLang === "ar"
                      ? response.data.message || "فشل إضافة المنتج إلى السلة"
                      : response.data.message || "Failed to add product to cart"
                  alert(errorMessage)
                }
              })
              .catch((error) => {
                const errorMessage =
                  currentLang === "ar"
                    ? "حدث خطأ أثناء إضافة المنتج إلى السلة"
                    : "Error occurred while adding product to cart"
                alert(errorMessage)
              })
              .finally(() => {
                addToCartBtn.textContent = originalText
                addToCartBtn.disabled = false
                addToCartBtn.style.opacity = "1"
              })
          } catch (error) {
            addToCartBtn.textContent = originalText
            addToCartBtn.disabled = false
            addToCartBtn.style.opacity = "1"
          }
        })

        controlsContainer.appendChild(addToCartBtn)
        contentContainer.appendChild(controlsContainer)

        form.appendChild(imageContainer)
        form.appendChild(contentContainer)
        card.appendChild(form)

        return card
      } catch (error) {
        return null
      }
    },

    createVariantsSection(product, currentLang) {
      const variantsContainer = document.createElement("div")
      variantsContainer.className = "hmstudio-upsell-variants"

      if (product.variants && product.variants.length > 0) {
        const variantAttributes = new Map()

        product.variants.forEach((variant) => {
          if (variant.attributes && variant.attributes.length > 0) {
            variant.attributes.forEach((attr) => {
              if (!variantAttributes.has(attr.name)) {
                variantAttributes.set(attr.name, {
                  name: attr.name,
                  slug: attr.slug,
                  values: new Set(),
                })
              }
              variantAttributes.get(attr.name).values.add(attr.value[currentLang])
            })
          }
        })

        variantAttributes.forEach((attr) => {
          const select = document.createElement("select")
          select.className = "variant-select"
          select.style.cssText = `
            margin: 5px 0;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 100%;
          `

          const labelText = currentLang === "ar" ? attr.slug : attr.name

          const label = document.createElement("label")
          label.textContent = labelText
          label.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          `

          const placeholderText = currentLang === "ar" ? `اختر ${labelText}` : `Select ${labelText}`
          let optionsHTML = `<option value="">${placeholderText}</option>`

          Array.from(attr.values).forEach((value) => {
            optionsHTML += `<option value="${value}">${value}</option>`
          })

          select.innerHTML = optionsHTML

          select.addEventListener("change", () => {
            this.updateSelectedVariant(product, select.closest("form"))
          })

          variantsContainer.appendChild(label)
          variantsContainer.appendChild(select)
        })
      }

      return variantsContainer
    },

    updateSelectedVariant(product, form) {
      if (!form) {
        return
      }

      const currentLang = getCurrentLanguage()
      const selectedValues = {}

      form.querySelectorAll(".variant-select").forEach((select) => {
        if (select.value) {
          const labelText = select.previousElementSibling.textContent
          selectedValues[labelText] = select.value
        }
      })

      const selectedVariant = product.variants.find((variant) => {
        return variant.attributes.every((attr) => {
          const attrLabel = currentLang === "ar" ? attr.slug : attr.name
          return selectedValues[attrLabel] === attr.value[currentLang]
        })
      })

      if (selectedVariant) {
        const productIdInput = form.querySelector('input[name="product_id"]')
        if (productIdInput) {
          productIdInput.value = selectedVariant.id
        }

        const priceElement = form.querySelector(".product-price")
        const oldPriceElement = form.querySelector(".product-old-price")
        const currencySymbol = currentLang === "ar" ? "ر.س" : "SAR"

        if (priceElement) {
          if (selectedVariant.formatted_sale_price) {
            priceElement.textContent = selectedVariant.formatted_sale_price.replace("SAR", currencySymbol)
            if (oldPriceElement) {
              oldPriceElement.textContent = selectedVariant.formatted_price.replace("SAR", currencySymbol)
              oldPriceElement.style.display = "inline"
            }
          } else {
            priceElement.textContent = selectedVariant.formatted_price.replace("SAR", currencySymbol)
            if (oldPriceElement) {
              oldPriceElement.style.display = "none"
            }
          }
        }

        const addToCartBtn = form.parentElement.querySelector(".add-to-cart-btn")
        if (addToCartBtn) {
          if (!selectedVariant.unavailable) {
            addToCartBtn.disabled = false
            addToCartBtn.style.opacity = "1"
            addToCartBtn.style.cursor = "pointer"
          } else {
            addToCartBtn.disabled = true
            addToCartBtn.style.opacity = "0.5"
            addToCartBtn.style.cursor = "not-allowed"
          }
        }
      }
    },

    async showUpsellModal(campaign, productCart) {
      if (!campaign?.upsellProducts?.length) {
        return
      }
      try {
        await fetch("https://europe-west3-hmstudio-85f42.cloudfunctions.net/trackUpsellStats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            storeId,
            eventType: "popup_open",
            campaignId: campaign.id,
            campaignName: campaign.name,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (error) {}

      const currentLang = getCurrentLanguage()
      const isRTL = currentLang === "ar"

      try {
        if (this.currentModal) {
          this.currentModal.remove()
        }

        const modal = document.createElement("div")
        modal.className = "hmstudio-upsell-modal"

        if (isRTL) modal.style.direction = "rtl"

        const content = document.createElement("div")
        content.className = "hmstudio-upsell-content"

        const closeButton = document.createElement("button")
        closeButton.innerHTML = "✕"
        closeButton.style.cssText = `
          position: absolute;
          top: 15px;
          ${isRTL ? "right" : "left"}: 15px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 5px;
          line-height: 1;
          z-index: 1;
        `
        closeButton.addEventListener("click", () => this.closeModal())

        const header = document.createElement("div")
        header.className = "hmstudio-upsell-header"

        const title = document.createElement("h2")
        title.className = "hmstudio-upsell-title"
        title.textContent =
          currentLang === "ar" ? decodeURIComponent(campaign.textSettings.titleAr) : campaign.textSettings.titleEn

        const subtitle = document.createElement("p")
        subtitle.className = "hmstudio-upsell-subtitle"
        subtitle.textContent =
          currentLang === "ar" ? decodeURIComponent(campaign.textSettings.subtitleAr) : campaign.textSettings.subtitleEn

        header.appendChild(title)
        header.appendChild(subtitle)

        const mainWrapper = document.createElement("div")
        mainWrapper.className = "hmstudio-upsell-main"

        const sidebar = document.createElement("div")
        sidebar.className = "hmstudio-upsell-sidebar"

        const benefitText = document.createElement("div")
        benefitText.style.cssText = `
          text-align: center;
          margin-bottom: 20px;
          font-size: 18px;
          color: #333;
          font-weight: bold;
        `
        benefitText.textContent = currentLang === "ar" ? "استفد من العرض" : "Benefit from the Offer"
        sidebar.appendChild(benefitText)

        const addAllButton = document.createElement("button")
        addAllButton.textContent = currentLang === "ar" ? "أضف الكل إلى السلة" : "Add All to Cart"
        addAllButton.style.cssText = `
          width: 100%;
          padding: 12px 20px;
          background: #000;
          color: white;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        `

        addAllButton.addEventListener("mouseover", () => {
          addAllButton.style.backgroundColor = "#333"
        })

        addAllButton.addEventListener("mouseout", () => {
          addAllButton.style.backgroundColor = "#000"
        })

        addAllButton.addEventListener("click", async () => {
          addAllButton.style.backgroundColor = "#333"
        })

        addAllButton.addEventListener("mouseout", () => {
          addAllButton.style.backgroundColor = "#000"
        })

        addAllButton.addEventListener("click", async () => {
          const forms = content.querySelectorAll("form")
          const variantForms = Array.from(forms).filter((form) => form.querySelector(".variant-select"))

          const allVariantsSelected = variantForms.every((form) => {
            const selects = form.querySelectorAll(".variant-select")
            return Array.from(selects).every((select) => select.value !== "")
          })

          if (!allVariantsSelected) {
            const message =
              currentLang === "ar"
                ? "الرجاء اختيار جميع الخيارات المطلوبة قبل الإضافة إلى السلة"
                : "Please select all required options before adding to cart"
            alert(message)
            return
          }

          addAllButton.disabled = true
          addAllButton.style.opacity = "0.7"
          const originalText = addAllButton.textContent
          addAllButton.textContent = currentLang === "ar" ? "جاري الإضافة..." : "Adding..."

          for (const form of forms) {
            await new Promise((resolve) => {
              const productId = form.querySelector('input[name="product_id"]').value
              const productName = form.querySelector(".hmstudio-upsell-product-title").textContent
              const quantityInput = form.querySelector("#product-quantity")
              const quantity = Number.parseInt(quantityInput.value) || 1
              const priceElement = form.querySelector(".hmstudio-upsell-product-price")
              const priceText = priceElement.textContent.replace(/[^0-9.]/g, "")
              const price = Number.parseFloat(priceText) || 0

              zid.store.cart
                .addProduct({ formId: form.id })
                .then((response) => {
                  if (response.status === "success") {
                    if (typeof setCartBadge === "function") {
                      setCartBadge(response.data.cart.products_count)
                    }

                    fetch("https://europe-west3-hmstudio-85f42.cloudfunctions.net/trackUpsellStats", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        storeId,
                        eventType: "cart_add",
                        productId,
                        productName,
                        quantity,
                        price,
                        campaignId: campaign.id,
                        campaignName: campaign.name,
                        timestamp: new Date().toISOString(),
                      }),
                    }).catch((error) => {})
                  }
                  resolve()
                })
                .catch((error) => {
                  resolve()
                })
            })
          }

          modal.remove()

          this.closeModal()
        })

        sidebar.appendChild(addAllButton)

        const productsGrid = document.createElement("div")
        productsGrid.className = "hmstudio-upsell-products"

        const productCards = await Promise.all(
          campaign.upsellProducts.map((product) => this.createProductCard(product, campaign)),
        )

        productCards.filter(Boolean).forEach((card) => {
          card.className = "hmstudio-upsell-product-card"
          productsGrid.appendChild(card)
        })

        mainWrapper.appendChild(sidebar)
        mainWrapper.appendChild(productsGrid)

        content.appendChild(closeButton)
        content.appendChild(header)
        content.appendChild(mainWrapper)
        modal.appendChild(content)

        document.body.appendChild(modal)
        requestAnimationFrame(() => {
          modal.style.opacity = "1"
          content.style.transform = "translateY(0)"
        })

        this.currentModal = modal

        let touchStartY = 0
        content.addEventListener("touchstart", (e) => {
          touchStartY = e.touches[0].clientY
        })

        content.addEventListener("touchmove", (e) => {
          const touchY = e.touches[0].clientY
          const diff = touchY - touchStartY

          if (diff > 0 && content.scrollTop === 0) {
            e.preventDefault()
            content.style.transform = `translateY(${diff}px)`
          }
        })

        content.addEventListener("touchend", (e) => {
          const touchY = e.changedTouches[0].clientY
          const diff = touchY - touchStartY

          if (diff > 100 && content.scrollTop === 0) {
            this.closeModal()
          } else {
            content.style.transform = "translateY(0)"
          }
        })

        modal.addEventListener("click", (e) => {
          if (e.target === modal) this.closeModal()
        })

        const handleEscape = (e) => {
          if (e.key === "Escape") this.closeModal()
        }
        document.addEventListener("keydown", handleEscape)

        modal.addEventListener("remove", () => {
          document.removeEventListener("keydown", handleEscape)
        })
      } catch (error) {}
    },

    closeModal() {
      if (this.currentModal) {
        this.currentModal.style.opacity = "0"
        const content = this.currentModal.querySelector(".hmstudio-upsell-content")
        if (content) {
          content.style.transform = "translateY(20px)"
        }
        setTimeout(() => {
          if (this.currentModal) {
            this.currentModal.remove()
            this.currentModal = null
          }
        }, 300)
      }
    },

    initialize() {
      if (!window.HMStudioUpsell) {
        window.HMStudioUpsell = {
          showUpsellModal: (...args) => {
            return this.showUpsellModal.apply(this, args)
          },
          closeModal: () => this.closeModal(),
        }
      }

      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.currentModal) {
          this.closeModal()
        }
      })

      window.addEventListener("resize", () => {
        if (this.currentModal) {
          const content = this.currentModal.querySelector(".hmstudio-upsell-content")
          if (content) {
            content.style.maxHeight = `${window.innerHeight * 0.9}px`
          }
        }
      })

      window.addEventListener("beforeunload", () => {
        if (this.currentModal) {
          this.closeModal()
        }
      })
    },
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      UpsellManager.initialize()
    })
  } else {
    UpsellManager.initialize()
  }
})()

