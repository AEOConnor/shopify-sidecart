

// Items comes form mobile-cart.liquid which has all products in the cart and thier cross sells
window.vue = {}
// eslint-disable-next-line no-undef
var vue = new Vue({
	el: '#cart-container', 
	data: {
		// eslint-disable-next-line no-undef
		allProducts: productsAll, // comes from mobile-cart.liquid
		// eslint-disable-next-line no-undef
		products: items, // Comes from mobile-cart.liquid
		navOpen: false,
		cartOpen: false,
		updating: false,
		error: false, 
		updateFinished: true,
		// eslint-disable-next-line no-undef
		lang: lang, // Comes from mobile-cart.liquid 
		// eslint-disable-next-line no-undef
		file_url: file, // Comes from mobile-cart.liquid
		loaded: false,
		update_message: '',
		number_of_products: 0,
		// eslint-disable-next-line no-undef
		emptyCartProducts: emptyCartProducts, // Comes from mobile-cart.liquid
		sale: {
			active: false,
			code: null,
			color: null,
			background: null,
			discount_amount: 0,
			data: null
		}
	},
	created: function () {
		window.vue = this
		this.getSale()
		this.crossSells()
		this.numberOfProducts()
	},
	computed: {
		totalPrice: function () {
			var price = 0
			for (var i = 0; i < this.products.length; i++) {
				price = price + parseInt(this.products[i].data.final_line_price)
			}
			return this.formatPrice(price)
		}
	},
	methods: {
		getSale: function () {
			var xhr = new XMLHttpRequest()
			var vue = this
			xhr.onload = function () {
				if (xhr.status >= 200 && xhr.status < 300) {
					var data = JSON.parse(xhr.response)
					var today = new Date()
					var utc = today.getTime() + (today.getTimezoneOffset() * 60000)
					today = new Date(utc + (3600000 * (-5)))
					for (var i = 0; i < data.sale.length; i++) {
						var saleData = data.sale[i]
						var saleStart = new Date(saleData.saleStart).getTime() + (new Date(saleData.saleStart).getTimezoneOffset() * 60000)
						saleStart = new Date(saleStart + (3600000 * (-5)))
						var saleEnd = new Date(saleData.saleEnd).getTime() + (new Date(saleData.saleEnd).getTimezoneOffset() * 60000)
						saleEnd = new Date(saleEnd + (3600000 * (-5)))
						if (today >= saleStart && today <= saleEnd) {
							vue.sale.active = true
							vue.sale.data = saleData
							vue.sale.code = saleData.promoCode
							vue.sale.color = saleData.color
							vue.sale.background = saleData.background
							vue.setSale()
							break
						}
					}
				}
			}
			xhr.open('GET', '/cart?view=sale.json')
			xhr.send()
		}, // this function is working now (tested with the discount-percent/discount/amount sale types)
		setSale: function () {
			if (this.sale.data !== null) {
				for (var k = 0; k < this.sale.data.saleDetails.products.length; k++) {
					for (var j = 0; j < this.products.length; j++) {
						// if the discount property hasn't been set, then set the discount - only fires once per product

						if (this.sale.data.saleDetails.products[k].handle === this.products[j].data.handle && this.sale.data.saleDetails.products[k].saleType === 'bogo') {
							var quantity = 0
							var condition = false

							for (var l = 0; l < this.products.length; l++) {
								if (this.sale.data.saleDetails.products[k].condition === this.products[l].data.handle) {
									condition = true
									quantity = this.products[l].data.quantity
								}
							}

							if (condition) {
								// if this function hasn't fired yet, sale hasn't been applied, else it has and don't reset
								if (quantity > 0 && this.products[j].saleApplied === undefined) {
									this.products[j].data.final_line_price = (this.calculatePrice(this.products[j].data.final_line_price, this.sale.data.saleDetails.products[k].saleType, this.sale.data.saleDetails.products[k].discount))
									this.products[j].data.price = this.products[j].data.final_line_price
									this.products[j].discount = (this.sale.data.saleDetails.products[k].discount * quantity)
									this.products[j].discounted_price = (this.calculatePrice((this.products[j].data.final_line_price), this.sale.data.saleDetails.products[k].saleType, this.sale.data.saleDetails.products[k].discount))
									this.products[j].original_price = this.products[j].discounted_price
									this.products[j].discount_label = this.discountString(this.sale.data.saleDetails.products[k].saleType, this.sale.data.saleDetails.products[k].discount)
									this.sale.discount_amount = this.sale.discount_amount + (this.products[j].data.final_line_price - this.products[j].discount)
								}
								// set sale applied
								this.products[j].saleApplied = true
							} else {
								delete this.products[j].discount
								delete this.products[j].discounted_price
								delete this.products[j].discount_label
								delete this.sale.discount_amount
								this.products[j].original_price = this.products[j].original_price
								this.products[j].data.final_line_price = this.products[j].data.final_price * this.products[j].data.quantity
								this.products[j].data.price = this.products[j].data.final_line_price
							}
						} else if (this.sale.data.saleDetails.products[k].handle === this.products[j].data.handle && this.products[j].discount == null && this.sale.data.saleDetails.products[k].autoDiscount) {
							// BOGO
							if (this.sale.data.saleDetails.products[k].saleType === 'bogo') {
								quantity = 0
								condition = false
								for (var m = 0; m < this.products.length; m++) {
									if (this.sale.data.saleDetails.products[k].condition === this.products[m].data.handle) {
										condition = true
										quantity = this.products[m].data.quantity
									}
								}
								if (condition) {
									if (quantity > 0) {
										// final_line_price changed to final_price in calcPrice function
										this.products[j].data.final_line_price = (this.calculatePrice(this.products[j].data.final_price, this.sale.data.saleDetails.products[k].saleType, this.sale.data.saleDetails.products[k].discount) * quantity)
										this.products[j].data.price = this.products[j].data.final_line_price
										this.products[j].discount = (this.sale.data.saleDetails.products[k].discount * quantity)
										this.products[j].discounted_price = (this.calculatePrice((this.products[j].data.final_price), this.sale.data.saleDetails.products[k].saleType, this.sale.data.saleDetails.products[k].discount))
										this.products[j].original_price = this.products[j].discounted_price
										this.products[j].discount_label = this.discountString(this.sale.data.saleDetails.products[k].saleType, this.sale.data.saleDetails.products[k].discount)
										this.sale.discount_amount = this.sale.discount_amount + (this.products[j].data.final_price - this.products[j].discount)
									}
								}
							} else {
								this.products[j].data.final_line_price = (this.calculatePrice(this.products[j].data.final_price, this.sale.data.saleDetails.products[k].saleType, this.sale.data.saleDetails.products[k].discount) * this.products[j].data.quantity)
								this.products[j].data.price = this.products[j].data.final_line_price
								this.products[j].discount = (this.products[j].data.price * this.products[j].data.quantity)
								this.products[j].discounted_price = (this.calculatePrice((this.products[j].data.final_price), this.sale.data.saleDetails.products[k].saleType, this.sale.data.saleDetails.products[k].discount))
								this.products[j].original_price = this.products[j].discounted_price
								this.products[j].discount_label = this.discountString(this.sale.data.saleDetails.products[k].saleType, this.sale.data.saleDetails.products[k].discount)
								this.sale.discount_amount = this.sale.discount_amount + (this.products[j].data.final_price - this.products[j].discount)
							}
						}
					}
					for (j = 0; j < this.allProducts.length; j++) {
						if (this.sale.data.saleDetails.products[k].handle === this.allProducts[j].handle && this.sale.data.saleDetails.products[k].autoDiscount && this.allProducts[j].discount_code == null) {
							for (var index = 0; index < this.allProducts[j].variants.length; index++) {
								this.allProducts[j].variants[index].data.discount = this.allProducts[j].variants[index].data.price
								this.allProducts[j].variants[index].data.price = this.calculatePrice(this.allProducts[j].variants[index].data.price, this.sale.data.saleDetails.products[k].saleType, this.sale.data.saleDetails.products[k].discount)
							}
							this.allProducts[j].onSale = true
							this.allProducts[j].discount_code = this.sale.data.saleDetails.products[k].saleType
							this.allProducts[j].saleType = this.sale.data.saleDetails.products[k].saleType
							this.allProducts[j].cartLabel = this.sale.data.saleDetails.products[k].cartLabel
							this.allProducts[j].discount_label = this.discountString(this.sale.data.saleDetails.products[k].saleType, this.sale.data.saleDetails.products[k].discount)
						}
					}
				}
			}
		},
		formatPrice: function (val) {
			var negitiveSymbol = ''
			if (val < 0) {
				val = val * -1
				negitiveSymbol = '-'
			}
			if (this.lang === 'EN') {
				return negitiveSymbol + '$' + (val / 100)
			}
			if (this.lang === 'FR') {
				return negitiveSymbol + (val / 100) + '$'
			}
		},
		calculatePrice: function (price, type, discount) {
			if (type === 'Percentage' || type === 'discount-percent') {
				return (price * ((100 - discount) / 100)).toFixed(2)
			} else if (type === 'amount' || type === 'bogo') {
				discount = discount + '00'
				return price - parseFloat(discount)
			}
		},
		discountString: function (type, discount) {
			if (type === 'Percentage' || type === 'discount-percent') {
				if (this.lang === 'FR') {
					return discount + '% de rabais'
				}
				return discount + '% off'
			} else if (type === 'amount') {
				if (this.lang === 'FR') {
					return discount + '$ de rabais'
				}
				return '$' + discount + ' off'
			} else if (type === 'bogo') {
				return 'BOGO'
			}
		},
		colorClass: function (colour) {
			return colour.toLowerCase().replace(' ', '-')
		},
		removeClasses: function (ele, eleClasses, classname) {
			Array.prototype.forEach.call(eleClasses, function (cl) {
				if (cl !== undefined || cl !== null) {
					if (JSON.stringify(cl).indexOf(classname) !== -1) {
						ele.classList.remove(cl)
					}
				}
			})
		},
		isInArray: function (needle, haystack) {
			for (var i = 0; i < haystack.length; i++) {
				if (haystack[i].data.variant_id === needle) {
					return true
				}
				return false
			}
		},
		updateVariants: function (variantSwatches, productData, response) {
			if (variantSwatches.length > 0) {
				productData.variants = variantSwatches
				return productData
			} else {
				productData.variants = response.variants
				Array.prototype.forEach.call(productData.variants, function (variant) {
					variant.activeSwatch = 'false'
				})
				return productData
			}
		},
		getTopProduct: function (productRank, topProduct, variantRank) {
			// loop through all products in the cart
			for (var i = 0; i < vue.products.length; i++) {
				// if product rank is greater or equal to products rank, save it as top product
				if (productRank >= vue.products[i].rank) {
					productRank = vue.products[i].rank
					topProduct = vue.products[i]
				}
				if ((i + 1) === vue.products.length) {
					// once top product is found, get variant rank
					vue.getVariantRank(productRank, topProduct, variantRank)
				}
			}
		},
		getVariantRank: function (productRank, topProduct, variantRank) {
			// loop through top product variants
			for (var k = 0; k < topProduct.variants.length; k++) {
				// match variant size with chosen variant
				if (topProduct.data.variant_options[0] === topProduct.variants[k].data.option1) {
					// save variant rank
					variantRank = topProduct.variants[k].rank
				}
				if ((k + 1) === topProduct.variants.length) {
					// once variant rank saved, get cross sells
					vue.createCrossSells(productRank, topProduct, variantRank)
				}
			}
		},
		createCrossSells: function (productRank, topProduct, variantRank) {
			var fileUrl = vue.file_url.split('?')

			// loop through available cross sell products
			for (var c = 0; c < vue.allProducts.length; c++) {
				// loop through cross sell product variants
				for (var v = 0; v < vue.allProducts[c].variants.length; v++) {
					var swatch = ''
					if (vue.allProducts[c].variants[v].data.option2 !== null) {
						swatch = '-' + vue.allProducts[c].variants[v].data.option2.split(' ').join('-').toLowerCase()
					}
					vue.allProducts[c].variants[v].featured_image = fileUrl[0] + 'Endy-Side-Cart-Cross-Sell-' + vue.allProducts[c].handle + swatch + '-78x78-2x.png?' + fileUrl[1]
					vue.allProducts[c].url = '/products/' + vue.allProducts[c].handle
					vue.allProducts[c].productId = vue.allProducts[c].id
					vue.allProducts[c].variants[v].activeVariant = false
          // if product rank matches, or if variant size matches, or if variant size is grey (weighted blanket), condition passes
					if (vue.allProducts[c].variants[v].rank.indexOf(variantRank.split(',')[0]) >= 0) {
						if(vue.allProducts[c].variants[v].data.option2 == 'Alpine White' || vue.allProducts[c].variants[v].data.option2 == null){
							vue.allProducts[c].variants[v].activeVariant = true
						}
					}
				}

				// once product loop has finished
				if ((c + 1) === vue.allProducts.length) {
					// sort all products based on rank
					vue.allProducts.sort(function (a, b) {
						return a.rank - b.rank
					})
				}
			}
		},
		crossSells: function () {
			var productRank = 1000 // Product's Rank
			var variantRank = 1000 // Variant's Rank
			var vue = this
			var topProduct

			if (vue.products.length !== undefined && vue.allProducts.length > 0) {
				// loop through all available products in the store
				// if products are in the cart, remove them from products list
				for (var m = 0; m < vue.products.length; m++) {
					for (var l = 0; l < vue.allProducts.length; l++) {
						if (vue.allProducts[l].handle === vue.products[m].data.handle) {
							vue.allProducts.splice(l, 1)
						}
					}
					if ((m + 1) === vue.products.length) {
						// once available product cross sell list, complete, get top product in cart
						vue.getTopProduct(productRank, topProduct, variantRank)
					}
				}
			}
		},
		addToCart: function (quantity, variantId, productId, button, index) {
			var vue = this
			var data = {
				quantity: quantity,
				id: variantId
			}
			vue.updateCartState()

			var xhr = new XMLHttpRequest()
			xhr.open('POST', '/cart/add.js', true)
			xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')

			xhr.onreadystatechange = function () { // Call a function when the state changes.
				if (xhr.readyState === 4 && xhr.status === 200) {
					var response = JSON.parse(xhr.responseText)
					for (var i = 0; i < vue.allProducts.length; i++) {
						if (vue.allProducts[i].productId === productId) {
							vue.allProducts.splice(i, 1)
						}
					}
					var swatch
					var swatchVar
					if (response.variant_options.length > 1) {
						swatch = response.variant_options[1]
						swatchVar = '-' + swatch.toLowerCase().replace(' ', '-')
					} else {
						swatch = null
						swatchVar = null
					}

					var fileUrl = vue.file_url.split('?')

					function checkSwatches (swatch) {
						if (swatch !== null) {
							return response.handle + swatch
						} else {
							return response.handle
						}
					}

					var data = {
						displayVariants: false,
						decrease_available: false,
						show: 'display',
						hide: 'none',
						data: response,
						featured_image: fileUrl[0] + 'Endy-Side-Cart-' + checkSwatches(swatchVar) + '-85x75-2x.jpg?' + fileUrl[1],
						colour: swatchVar,
						chosen_variant: response.variant_title.replace(' ', '-').toLowerCase()
					}
					vue.returnVariants(data, button, index)
				} else if (xhr.status === 400 || xhr.status === 500) {
					document.querySelector(button).classList.remove('adding')
					document.querySelector(button).disabled = false
					document.querySelector(button).textContent = 'Oops, something went wrong. Try adding again.'
				}
			}
			xhr.send(JSON.stringify(data))
		},
		returnVariants: function (productData, button, index) {
			var vue = this
			var xhr = new XMLHttpRequest()
			xhr.open('GET', '/products/' + productData.data.handle + '?view=json', true)
			xhr.onreadystatechange = function () { // Call a function when the state changes.
				if (xhr.readyState === 4 && xhr.status === 200) {
					var response = JSON.parse(xhr.responseText)

					productData.variants = response.variants
					vue.returnProductMeta(productData, button, index)
				}
			}
			xhr.send()
		},
		returnProductMeta: function (productData, button, index) {
			var vue = this
			var xhr = new XMLHttpRequest()
			xhr.open('GET', '/products/' + productData.data.handle + '?view=json', true)
			xhr.onreadystatechange = function () { // Call a function when the state changes.
				if (xhr.readyState === 4 && xhr.status === 200) {
					var response = JSON.parse(xhr.responseText)
					var colourVariant = productData.colour
					var variantSwatches = []
					for (var k = 0; k < response.variants.length; k++) {
						if (response.variants[k].data.option2 !== null) {
							colourVariant = productData.colour.toLowerCase().replace(' ', '-')
							var colourVariantDash = '-' + colourVariant
							var variantSwatch = '-' + response.variants[k].data.option2.toLowerCase().replace(' ', '-')
							if (variantSwatch === colourVariant || variantSwatch === colourVariantDash) {
								response.variants[k].activeSwatch = colourVariant
								variantSwatches.push(response.variants[k])
							}
						}
					}

					function updateVariants (variantSwatches) {
						if (variantSwatches.length > 0) {
							productData.variants = variantSwatches
							return productData
						} else {
							productData.variants = response.variants
							Array.prototype.forEach.call(productData.variants, function (variant) {
								variant.activeSwatch = 'false'
							})
							return productData
						}
					}

					productData.rank = response.rank
					updateVariants(variantSwatches) // function called to check for swatches and update the variants array
					productData.cross_sell = response.cross_sell
					productData.decrease_available = !(productData.data.quantity > 1)
					productData.displayVariants = false
					productData.trashWarning = false

					// change product
					if (index !== 0) {
						vue.products.splice(index, 1)
					}
					// if this item exists but is being updated from the shop module, remove the existing item
					for (var i = 0; i < vue.products.length; i++) {
						if (vue.products[i].data.variant_id === productData.data.variant_id) {
							vue.products.splice([i], 1)
						}
					}

					vue.products.splice(index, 0, productData)
					// if response is successful, treat button on shop page, then open cart
					if (button !== null) {
						document.querySelector(button).classList.remove('adding')
						document.querySelector(button).disabled = false
						document.querySelector(button).textContent = 'Added'
						setTimeout(function () {
							document.querySelector(button).textContent = 'Add to cart'
						}, 2000)
						vue.toggleCart()
					}
					vue.resetCartState()
				} else if (xhr.status === 400 || xhr.status === 500) {
					vue.error = true
				}
			}
			xhr.send()
		},
		getCart: function () {
			var vue = this
			var xhr = new XMLHttpRequest()

			xhr.onload = function () {
				if (xhr.status >= 200 && xhr.status < 300) {
					vue.error = false
				} else if (xhr.readyState !== 4 && xhr.status !== 200) {
					vue.error = true
				}
			}
			xhr.open('GET', 'cart.js')
			xhr.send()
		},
		updateCart: function (data) {
			var vue = this
			vue.updateCartState()
			var xhr = new XMLHttpRequest()
			var update = {
				'updates': data
			}
			xhr.open('POST', '/cart/update.js')
			xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4 && xhr.status === 200) {
					var data = JSON.parse(xhr.responseText)
					for (var k = 0; k < data.items.length; k++) {
						for (var i = 0; i < vue.products.length; i++) {
							// Match up products

							if (vue.products[i].data.product_id === data.items[k].product_id) {
								// if new product has the same 'colour' as the old product

								if (vue.products[i].data.variant_options[1] === data.items[k].variant_options[1]) {
									// if new product has a different title then its the new one

									if (vue.products[i].data.variant_id !== data.items[k].variant_id) {
										for (var z = 0; z < vue.products.length; z++) {
											if (vue.products[z].data.variant_id === data.items[k].variant_id) {
												return // PRODUCT EXISITS AND WONT CARRY ON BELOW
											}
										}
										// IF THERE ANY PRODUCT LEFT THEY ARE NEW AND CONTINUE
										var fileUrl = vue.file_url.split('?')
										var swatch = ''
										if (data.items[k].variant_options.length > 1) {
											swatch = '-' + data.items[k].variant_options[1].replace(' ', '-').toLowerCase()
										}

										var dataUpdate = {
											displayVariants: false,
											decrease_available: false,
											show: 'display',
											hide: 'none',
											data: data.items[k],
											featured_image: fileUrl[0] + 'Endy-Side-Cart-' + data.items[k].handle + swatch + '-85x75-2x.jpg?' + fileUrl[1],
											colour: data.items[k].variant_options[1],
											chosen_variant: data.items[k].variant_title.replace(' ', '-').toLowerCase()
										}

										var button = null
										vue.returnVariants(dataUpdate, button, [i])
										break
									}
								}
							}
						}
					}
				}
			}
			xhr.send(JSON.stringify(update))
		},
		changeProductQuantity: function (quantity, id) {
			var vue = this
			vue.updateCartState()

			var data = {
				quantity: JSON.stringify(quantity),
				id: JSON.stringify(id)
			}
			var xhr = new XMLHttpRequest()
			xhr.open('POST', '/cart/change.js', true)
			xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')

			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4 && xhr.status === 200) {
					var data = JSON.parse(xhr.responseText)
					for (var i = 0; i < data.items.length; i++) {
						for (var k = 0; k < vue.products.length; k++) {
							if (data.items[i].id === vue.products[k].data.id && vue.products[k].data.id === id) {
								var updateItem = vue.products[k]

								for (var j = 0; j < updateItem.variants.length; j++) {
									// if item is available, update it's quantity

									if (updateItem.variants[j].data.id === updateItem.data.id && updateItem.variants[j].data.available) {
										var prod = data.items[i]

										// change product quantity and check avail of product
										function changePriceQty (updateItem, dataItem) {
											updateItem.data = dataItem

											// if there's a sale, change price based on values returned from setSale function, else return values from the ajax respone
											if (vue.sale.active && updateItem.discount_label === 'BOGO') {
												if (updateItem.quantity > 1) {
													updateItem.data.price = ((updateItem.final_price * dataItem.quantity) - updateItem.discount)
													updateItem.data.final_line_price = (updateItem.data.final_line_price - updateItem.discount)
												} else {
													// remove updateItem sale applied so it can reset the sale object
													delete updateItem.saleApplied
													vue.setSale()
												}
											} else if (vue.sale.active && updateItem.discount !== null && vue.sale.code !== 'bogo-sale') {
												// need to reset the price for discount items with sale type amount

												if (updateItem.discount !== undefined) {
													updateItem.data.final_line_price = updateItem.discounted_price * dataItem.quantity
													updateItem.data.price = updateItem.discounted_price * dataItem.quantity
												} else {
													updateItem.data.price = updateItem.data.quantity * updateItem.data.final_price
													updateItem.data.final_line_price = updateItem.data.final_price * updateItem.data.quantity
												}
											} else {
												updateItem.data.price = updateItem.data.quantity * updateItem.data.final_price
												updateItem.data.final_line_price = updateItem.data.final_price * updateItem.data.quantity
											}

											// if quantity is greater less than one, or cart is updating, disable decrease button
											if (updateItem.data.quantity > 1) {
												updateItem.decrease_available = false
											} else {
												updateItem.decrease_available = true
											}
											return updateItem
										}
										// call change price
										changePriceQty(updateItem, prod)
										vue.resetCartState()
									} else if (updateItem.variants[j].data.id === updateItem.data.id && !updateItem.variants[j].data.available) {
										updateItem.increase_not_available = true
									}
								}
							}
						}
					}
				} else if (xhr.status === 400 || xhr.status === 500) {
					vue.error = true
				}
				setTimeout(function () {
					vue.numberOfProducts()
				}, 1000)
			}
			setTimeout(function () {
				xhr.send(JSON.stringify(data))
			}, 1000)
		},
		resetAddToCartButton: function (button) {
			if (button.classList.contains('adding')) {
				button.classList.remove('adding')
				button.disabled = false
				button.textContent = 'Add To Cart'
			}
		},
		numberOfProducts: function () {
			var num = 0
			Array.prototype.forEach.call(this.products, function (product) {
				num = num + product.data.quantity
			})
			this.number_of_products = num
			return num
		},
		trashWarning: function (productId, trashWarning) {
			var vue = this
			Array.prototype.forEach.call(vue.products, function (product) {
				if (product.data.id === productId) {
					product.trashWarning = !trashWarning
				}
				return product
			})
			setTimeout(function () {
				Array.prototype.forEach.call(vue.products, function (product) {
					if (product.data.id === productId) {
						product.trashWarning = false
					}
					return product
				})
			}, 2500)
		},
		toggleCart: function () {
			this.cartOpen = !this.cartOpen
			var cartContainer = document.querySelector('#cart-container')
			if (this.cartOpen) {
				gsap.to(cartContainer, {
					right: 0,
					duration: 0.25,
					ease: Power2.easeOut,
					onComplete: function () {
						document.querySelector('body').classList.add('drawer-open')
					}
				})
			} else {
				gsap.to(cartContainer, {
					right: -396,
					duration: 0.25,
					ease: Power2.easeOut,
					onComplete: function () {
						document.querySelector('body').classList.remove('drawer-open')
					}
				})
			}
		},
		removeProduct: function (qty, variantId) {
			var vue = this
			vue.updateCartState()
			var data = {
				quantity: JSON.stringify(qty),
				id: JSON.stringify(variantId)
			}
			var xhr = new XMLHttpRequest()
			xhr.open('POST', '/cart/change.js', true)
			xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4 && xhr.status === 200) {
					var i = 0
					Array.prototype.forEach.call(vue.products, function (product) {
						if (product.data.id === variantId) {
							var id = '#id-' + product.data.id
							var index = i
							gsap.to(id, {
								opacity: 0,
								duration: 1,
								onComplete: function () {
									gsap.to(id, {
										height: 0,
										duration: 1,
										onComplete: function () {
											gsap.set(id, {
												display: 'none',
												onComplete: function () {
													vue.products.splice(index, 1)
													vue.resetCartState()
												}
											})
										}
									})
								}
							})
						}
						i++
					})
				} else if (xhr.status === 400 || xhr.status === 500) {
					vue.error = true
				}
			}
			xhr.send(JSON.stringify(data))
		},
		showProductVariants: function (productId, variantTitle) {
			var vue = this
			vue.updating = true
			Array.prototype.forEach.call(vue.products, function (product) {
				if (product.data.id === productId && product.data.variant_title === variantTitle) {
					if (!product.displayVariants) {
						product.displayVariants = !product.displayVariants
						document.querySelector('.cart-items').classList.add('variants')
						document.querySelector('.cart-cross-sell').classList.add('variants')
						document.querySelector('#id-' + productId).style.zIndex = '10'
					} else {
						product.displayVariants = false
					}
				} else {
					document.querySelector('#id-' + product.data.id).style.zIndex = '7'
				}
				return product
			})
			this.closeVariants(productId)
		},
		closeVariants: function (productId) {
			var vue = this
			var closeButton = 'close-cart-sizing-' + productId
			vue.updating = false
			window.addEventListener('click', function (e) {
				if (e.target === document.querySelector('.cart-items.variants') || e.target.id === closeButton || e.target === document.querySelector('.cart-cross-sell.variants')) {
					Array.prototype.forEach.call(vue.products, function (product) {
						product.displayVariants = false
						document.querySelector('.cart-items').classList.remove('variants')
						document.querySelector('.cart-cross-sell').classList.remove('variants')
						document.querySelector('#id-' + productId).style.zIndex = '7'
					})
				}
			})
		},
		changeProductSize: function (currVariant, qtyToAdd, newVariant) {
			var vue = this
			var data = {}
			data[currVariant] = 0
			data[newVariant] = qtyToAdd
			for (var k = 0; k < vue.products.length; k++) {
				if (vue.products[k].data.id === currVariant && currVariant !== newVariant) {
					var currVarEle = document.querySelector('#varr-' + currVariant)
					var newVarEle = document.querySelector('#varr-' + newVariant)
					currVarEle.style.backgroundColor = '#fff'
					currVarEle.children[0].style.color = '#243746'
					currVarEle.style.fontFamily = "'CalibreWeb-Regular', 'Helvetica', 'sans-serif'"
					newVarEle.style.backgroundColor = '#243746'
					newVarEle.children[0].style.color = '#fff'
					newVarEle.style.fontFamily = "'CalibreWeb-Semibold', 'Helvetica', 'sans-serif'"
					this.updateCart(data)
				}
			}
		},
		checkout: function () {
			var vue = this
			var couponCode = vue.sale.code
			if (sessionStorage.getItem('discount')) {
				couponCode = sessionStorage.getItem('discount')
			}

			if (couponCode == null) { 
				couponCode = ''
			}

			var url = '/checkout/' + '?discount=' + couponCode + ''

			window.location.href = url
		},
		updateCartState: function () {
			// while cart is updating, disable checkout button and change text
			var vue = this
			vue.updating = true
  
			var checkoutButton = document.querySelector('.cart-checkout-button')
			if (checkoutButton !== null) {
				checkoutButton.disabled = true
				checkoutButton.textContent = 'Updating Cart'
			}
		},
		svgDraw: function(ele) {
			var tl = new TimelineMax()
			TweenMax.set('#checkmark-path', {opacity: 0, drawSVG: '0%', onComplete: function(){}}); 
			tl.to('.sp-circle', {borderColor: '#c40058', delay: .2, onComplete: function() {
					tl.to('#checkmark-path', {opacity: 1, drawSVG: '100%', onComplete: function() {
						tl.to('#update-cart-text', {opacity: 0, duration: .3, onComplete: function(){
							document.getElementById('update-cart-text').textContent = "Your cart has been updated!"
							tl.to('#update-cart-text', {opacity: 1})
						}})
				}})
			}})
		},
		resetCartState: function () {
			var vue = this	
		setTimeout(function() {
			var checkoutButton = document.querySelector('.cart-checkout-button')
		
			if (checkoutButton !== null) {
				checkoutButton.disabled = false
				checkoutButton.textContent = 'Checkout'
			}
			vue.updating = false
			var cartItems = document.getElementsByClassName('cart-items')[0]
			var crossSell = document.getElementsByClassName('cart-cross-sell')[0]
			var cartItemsClasses = cartItems.classList
			var crossSellClasses = crossSell.classList
			vue.removeClasses(cartItems, cartItemsClasses, 'variants')
			vue.removeClasses(crossSell, crossSellClasses, 'variants')

		}, 1000)
			
		}
	},
	// watch function is working correctly - turns out we just don't need to call the sale function on every update
	watch: {
		products: function () {
			this.crossSells()

			if (this.sale.active) {
				this.setSale()
			}
			this.number_of_products = this.numberOfProducts()
			if (this.number_of_products === 0) {
				document.querySelector('#CartCount').classList.add('empty')
			} else {
				document.querySelector('#CartCount').classList.remove('empty')
			}
			if (document.querySelector('#CartCount .total_items') !== null) {
				document.querySelector('#CartCount .total_items').textContent = this.number_of_products
			}
		}
	}
})
