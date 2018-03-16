;(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define('MNSTR', [], function() {
			return (root['MNSTR'] = factory());
		});
	} else if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	} else {
		root['MNSTR'] = factory();
	}
}(this, function() {

/////////////////////////////////////////////////////////////////////////////////////
// PROPERTIES 				/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

function MNSTR (options) {
	// CONFIG

	this.context 							= this;
	this.parentNode 						= undefined; 			// Element this list will be appended to. If not provided, document.body will be used.
	this.getData 							= undefined; 			// Required. if you want to display something. Must return an array.
	this.getElementChildren 				= undefined; 			// Optional. Used for nested data. If set, must return an array, just like getData.
	this.getCellRenderer					= undefined; 			// Required. Must return a string or HTML element. Params: element, index, isExpanded, this.

	this.renderOnInitialize 				= true;
	this.initialScrollToElement				= undefined; 			// element.
	this.observeCellBounds 					= false; 				// If true, an iFrame will be used for each cell to observe if the bounds change. Use this, if cell bounds are highly volatile. Caution: iFrame rendering is very expensive. This might cause initial rendering delays.
	this.rememberChildrenExpands 			= true; 				// If set and an expanded element, which has children that are also expanded, is collapsed and re-expanded, the children will be re-expanded, too.
	this.thresholdRatio 					= 0.5;
	this.preventWheelBubbling 				= false; 				// If true, parent containers will not scroll if the wheel-event is triggered on this list. Strangely, this causes rendering issues when resizing cells manually. So it's set to false by default.
	this.useTransform 						= true;
	this.className 							= 'mnstr';

	// EVENTS / CALLBACKS

	this.didRenderFirstElement 				= undefined;
	this.didRenderLastElement 				= undefined;

	// PRIVATE

	this._data 								= undefined; 			// Reference to the array getData() has returned since the last call.
	this._scrollNode	 					= undefined; 			// Scrolling node that contains the list wrapper.
	this._listNode 							= undefined; 			// List that contains the cells.
	this._events 							= {}; 					// Cache for event listeners.

	this._lastScrollPosition 				= 0;
	this._lowestCellHeight 					= Number.MAX_VALUE;
	this._averageCellHeight 				= 1;
	this._currentMaxIndex 					= 0;
	this._cachedScrollToElement 			= undefined;
	this._frameRequests 					= {};

	this._cellsSorted 						= [];
	this._expandInformations 				= [];

	// INIT

	return this.initialize(options);
};

MNSTR.prototype = {
	/////////////////////////////////////////////////////////////////////////////////////
	// API 						/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	render: function (parentNode) {
		return this._render(parentNode);
	},

	addEventListener: function (event, listener) {
		return this._addEventListener(event, listener);
	},

	removeEventListener: function (event, listener) {
		return this._removeEventListener(event, listener);
	},

	getNode: function () {
		return this._scrollNode;
	},

	dataUpdated: function () {
		return this._dataUpdated();
	},

	cellBoundsUpdated: function () {
		return this._cellBoundsUpdated();
	},

	toggleExpandElement: function (element) {
		return this._toggleExpandElement(element);
	},

	expandElement: function (element) {
		return this._expandElement(element);
	},

	collapseElement: function (element) {
		return this._collapseElement(element);
	},

	isElementExpanded: function (element) {
		return this._isElementExpanded(element);
	},

	getRenderedCellRendererForElement: function (element) {
		var cells = this._getCellsSorted();

		for (var i = 0; i < cells.length; i++) {
			var cell = cells[i];

			if (cell.__element === element) {
				var renderer = cell.__contentEl.children[0];
				return renderer
					? renderer
					: cell.__contentEl.innerHTML;
			}
		}
	},

	scrollToTop: function () {
		var firstElement = this._getElementAndLevelAtIndex(0);
		this._scrollToElement(firstElement.element);
	},

	scrollToBottom: function () {
		var lastElement = this._getElementAndLevelAtIndex(this._currentMaxIndex);
		this._scrollToElement(lastElement.element);
	},

	scrollToElement: function (element) {
		this._scrollToElement(element);
	},

	reset: function () {
		this._reset();
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// INIT 					/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	initialize: function (options) {
		for (var key in options) {
			if (key.charAt(0) === '_') {
				continue;
			}

			options.hasOwnProperty(key) && this.hasOwnProperty(key)
				? this[key] = options[key]
				: void(0);
		}

		this.renderOnInitialize
			? this._render()
			: void(0);

		return this;
	},

	_reset: function () {
		this._data 										= undefined;
		this._lastScrollPosition 			= 0;
		this._lowestCellHeight 				= Number.MAX_VALUE;
		this._averageCellHeight 			= 1;
		this._currentMaxIndex 				= 0;
		this._cachedScrollToElement 	= undefined;
		this._frameRequests 					= {};
		this._cellsSorted 						= [];
		this._expandInformations 			= [];

		while (this._listNode.firstChild) {
		  this._listNode.removeChild(this._listNode.firstChild);
		}

		this._getData();
		this._setScrollPosition(0);
		this._maintainCellCount();
	},

	destroy: function () {

	},

	/////////////////////////////////////////////////////////////////////////////////////
	// RENDER 					/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	_render: function (parentNode) {
		this._getData();
		this._createScrollEl(parentNode);
		this._createListEl();

		this._initScrollListener();

		this._requestFrame(function () {
			this.__maintainCellCount();
			this._createListIFrame();
		}.bind(this), 'render');

		return this;
	},

	_createScrollEl: function (parentNode) {
		if (this._scrollNode && this._scrollNode.parentNode) {
			this._scrollNode.parentNode.removeChild(this._scrollNode);
			delete this._scrollNode;
		}

		this._scrollNode = document.createElement('div');
		this._scrollNode.classList.add(this.className);
		this._scrollNode.setAttribute('style', 'overflow-y: auto; -webkit-overflow-scrolling: touch; overflow-scrolling: touch; position: relative;');

		this.parentNode = parentNode || this.parentNode || document.body;
		this.parentNode.appendChild(this._scrollNode);
		return this._scrollNode;
	},

	_createListEl: function () {
		this._listNode = document.createElement('ul');
		this._listNode.classList.add(this.className + '-list');
		this._listNode.setAttribute('style', 'position: relative; overflow: hidden; list-style-type: none; margin: 0; padding: 0;');
		this._scrollNode.appendChild(this._listNode);
		return this._listNode;
	},

	_createIFrame: function (parentNode, resizeCallback) {
		var frame = document.createElement('iframe');
		frame.setAttribute('style', 'position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; border: none; opacity: 0; pointer-events: none; touch-action: none; z-index: -1000;');
		frame.onload = function (e) {
			e.target.contentWindow.onresize = resizeCallback.bind(this);
		}.bind(this);
		parentNode.appendChild(frame);
		return frame;
	},

	_createListIFrame: function () {
		this._scrollNode.__frame = this._createIFrame(this._scrollNode, this._onResizeList);
	},

	_createCell: function (index) {
		// Root node, which is a list item. We translate the node into 3D, which prevents
		// the whole list to repaint when changing the cells content.

		var cell = document.createElement('li');
		cell.classList.add(this.className + '-cell');
		cell.setAttribute('style', 'position: absolute; width: 100%; top: 0; left: 0;');

		// Cell bounds observing iframe. Only applied if the flag is set.

		if (this.observeCellBounds) {
			cell.__frame = this._createIFrame(cell, this._onResizeCell);
		}

		// Content node. This is needed, because adding the cell content directly
		// to the list item would cause a repaint on the list, even if the cell is tranlated.

		var content = document.createElement('div');
		content.classList.add(this.className + '-content');
		content.setAttribute('style', 'width: 100%; margin: 0; border: 0;');
		cell.appendChild(content);
		cell.__contentEl = content;

		this._listNode.appendChild(cell);
		return cell;
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// DOM QUERIES 				/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	_getComputedElementHeight: function (element) {
		return parseFloat(window.getComputedStyle(element).height);
	},

	// Scrolling element related.

	_cacheScrollNodeOffsetHeight: function (value) {
		this._scrollNode.__offsetHeight = value || this._scrollNode.offsetHeight;
		return this._scrollNode.__offsetHeight;
	},

	_getScrollNodeOffsetHeight: function () {
		return this._scrollNode.__offsetHeight || this._cacheScrollNodeOffsetHeight();
	},

	// Cells related.

	_getCellHeight: function (cell) {
		return cell.__height;
	},

	_getAllCellsHeight: function () {
		return this._getLastCellBottom() - this._getFirstCellTop();
	},

	_updateCellHeight: function (cell, computed) {
		cell.__height = computed
			? this._getComputedElementHeight(cell)
			: cell.clientHeight;
	},

	_getCellTop: function (cell) {
		return cell.__top || 0;
	},

	_setCellTop: function (cell, value) {
		value = Math.max(value, 0);

		this.useTransform
			? cell.style.transform = 'translateY(' + value  + 'px)'
			: cell.style.top = value + 'px';

		cell.__top = value;
	},

	_getCellBottom: function (cell) {
		return cell.__top + cell.__height;
	},

	_getFirstCellTop: function () {
		return this._cellsSorted && this._cellsSorted.length > 0
			? this._getCellTop(this._cellsSorted[0])
			: 0;
	},

	_getLastCellBottom: function () {
		return this._cellsSorted && this._cellsSorted.length > 0
			? this._getCellBottom(this._cellsSorted[this._cellsSorted.length - 1])
			: 0;
	},

	_getCells: function () {
		return this._listNode.children;
	},

	_updateCellsSorted: function () {
		this._cellsSorted = this._sortCells(this._getCells());
	},

	_sortCells: function (cells, revert) {
		cells = cells || this._getCells();
		var sorted = [].slice.call(cells);
		sorted.sort(function (a, b) {
			return revert
				? b.__index - a.__index
				: a.__index - b.__index;
		});

		return sorted;
	},

	_getCellsSorted: function () {
		return this._cellsSorted;
	},

	_getFirstRenderIndex: function () {
		return this._cellsSorted && this._cellsSorted.length > 0
			? this._cellsSorted[0].__index
			: -1;
	},

	_getLastRenderIndex: function () {
		return this._cellsSorted && this._cellsSorted.length > 0
			? this._cellsSorted[this._cellsSorted.length - 1].__index
			: -1;
	},

	// Scrolling element related.

	_getScrollPosition: function () {
		return this._scrollNode.scrollTop;
	},

	_setScrollPosition: function (value) {
		this._scrollNode.scrollTop = value;
	},

	_updateScrollPosition: function (value) {
		this._scrollNode.scrollTop += value;
	},

	// List related.

	_getListHeight: function () {
		return this._listNode.__height
			? this._listNode.__height
			: this._setListHeight(this._getComputedElementHeight(this._listNode));
	},

	_getMinimumListHeight: function () {
		var scrollElHeight = this._scrollNode.clientHeight
		return scrollElHeight + (scrollElHeight * (this.thresholdRatio * 2));
	},

	_setListHeight: function (value) {
		value = Math.max(value, 0);
		this._listNode.style.height = value + 'px';
		this._listNode.__height = value;
		return value;
	},

	_updateListBounds: function () {
		var lastCellBottom 	= this._getLastCellBottom();
		var listHeight 		= this._getListHeight();

		if (this._getLastRenderIndex() === this._currentMaxIndex) {
			if (lastCellBottom - listHeight !== 0) {
				this._setListHeight(lastCellBottom);
			}
		} else {
			var estimatedHeight = this._averageCellHeight * (this._currentMaxIndex + 1);
			var height 			= Math.max(lastCellBottom, estimatedHeight);

			height !== listHeight
				? this._setListHeight(height)
				: void(0);
		}
	},

	_getTopRenderThreshold: function () {
		return -this._scrollNode.clientHeight * this.thresholdRatio;
	},

	_getBottomRenderThreshold: function () {
		return this._scrollNode.clientHeight * this.thresholdRatio + this._scrollNode.clientHeight;
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// DATA HANDLING 			/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	_getData: function () {
		this._data = this.getData
			? this.getData.call(this.context, this)
			: [];

		this._updateCurrentMaxIndex();
		this._invalidateExpandInformations();
	},

	_dataUpdated: function () {
		this._getData();
		this._requestFrame(function () {
			this.__maintainCellCount();

			var scrollTop 		= this._getScrollPosition();
			var hookedCell 		= this.__maintainScrollPositionIntegrity();

			this.__updateCells();

			var hookedCellTop  	= hookedCell
									? this._getCellTop(hookedCell)
									: undefined;

			this.__updateCells(true);

			if (hookedCellTop !== undefined) {
				var newHookedCellTop = this._getCellTop(hookedCell);
				this._updateScrollPosition(newHookedCellTop - hookedCellTop);
			}
		}, 'dataupdate');
		return this;
	},

	_getElementAndLevelAtIndex: function (index) {
		if (!this._anyElementHasChildren()) {
			return this._createElementAndLevelInformation(this._data[index], 0);
		}

		var cumulativeLength = 0;

		for (var i = this._expandInformations.length - 1; i >= 0; i--) {
			var info = this._expandInformations[i];

			if (!info.active) {
				continue;
			}

			if (info.index >= index) {
				continue;
			}

			cumulativeLength += info.elementChildren.length;

			if (info.index + cumulativeLength < index) {
				continue;
			} else {
				var elementIndex = index - (info.index + cumulativeLength - info.elementChildren.length) - 1;
				return this._createElementAndLevelInformation(info.elementChildren[elementIndex], info.level);
			}
		}

		return this._createElementAndLevelInformation(this._data[index - cumulativeLength], 0);
	},

	_createElementAndLevelInformation: function (element, level) {
		return {element: element, level: level};
	},

	_updateCurrentMaxIndex: function () {
		var baseLength 		= this._data.length - 1;
		var expandLength 	= 0;

		for (var i = 0; i < this._expandInformations.length; i++) {
			var expandInformation = this._expandInformations[i];
			if (expandInformation.active) {
				expandLength += expandInformation.elementChildren.length;
			}
		}

		this._currentMaxIndex = baseLength + expandLength;
	},

	_anyElementHasChildren: function () {
		return this.getElementChildren !== undefined;
	},

	_getElementChildren: function (element) {
		return this._anyElementHasChildren()
			? this.getElementChildren.call(this.context, element, this)
			: undefined;
	},

	_getIndexForElement: function (element) {
		var elementIndex = this._data.indexOf(element);

		var data = elementIndex > -1
			? this._data
			: undefined;

		var matchingInfo 		= undefined;
		var matchingInfoIndex 	= 0;
		var cumulativeLength 	= 0;

		for (var i = 0; i < this._expandInformations.length; i++) {
			var info = this._expandInformations[i];

			if (data === this._data && !info.elementParent && info.index >= elementIndex) {
				break;
			}

			if (!data) {
				var index = info.elementChildren.indexOf(element);

				if (index > -1) {
					elementIndex 		= index;
					data 				= info.elementChildren;
					matchingInfo 		= info;
					matchingInfoIndex 	= info.index + 1;
					cumulativeLength 	= 0;
					continue;
				}
			}

			if (matchingInfo && info.level > matchingInfo.level) {
				var possibleIndex = matchingInfoIndex + elementIndex;

				if (possibleIndex <= info.index) {
					return possibleIndex;
				} else {
					cumulativeLength += info.elementChildren.length;
				}
			} else if (matchingInfo) {
				return matchingInfoIndex + elementIndex + cumulativeLength;
			} else {
				cumulativeLength += info.elementChildren.length;
			}
		}

		return elementIndex > -1
			? elementIndex + cumulativeLength + matchingInfoIndex
			: elementIndex;
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// EVENT INITS 				/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	_initScrollListener: function () {
		this._scrollNode.addEventListener('scroll', this._onScroll.bind(this));

		this.preventWheelBubbling
			? this._scrollNode.addEventListener('wheel', this._onWheel.bind(this))
			: void(0);
	},

	_addEventListener: function (event, listener) {
	    if (typeof this._events[event] !== 'object') {
	        this._events[event] = [];
	    }

	    this._events[event].push(listener);
	    return this;
	},

	_removeEventListener: function (event, listener) {
		var idx;

	    if (typeof this._events[event] === 'object') {
	        idx = indexOf(this._events[event], listener);

	        if (idx > -1) {
	            this._events[event].splice(idx, 1);
	        }
	    }
	},

	_emitEvent: function (event) {
	    var i, listeners, length, args = [].slice.call(arguments, 1);

	    if (typeof this._events[event] === 'object') {
	        listeners = this._events[event].slice();
	        length = listeners.length;

	        for (i = 0; i < length; i++) {
	            listeners[i].apply(this, args);
	        }
	    }

	    if (this[event]) {
	    	this[event].apply(this.context, args);
	    }
	},

	_emitElementEvents: function (element, index) {
		if (index === 0) {
			this._emitEvent('didRenderFirstElement', element, this);
		}

		if (index === this._currentMaxIndex) {
			this._emitEvent('didRenderLastElement', element, this);
		}
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// SCROLL HANDLING 			/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	// This is used to prevent the body or any other parent scrolling container
	// from scrolling when the end or beginning of this scrolling element is reached.
	// Neat, isn't it?

	_onWheel: function (e) {
		this.__onWheel(e);
	},

	__onWheel: function (e) {
		var d 				= e.deltaY;

		var didReachTop 	= d < 0 && this._scrollNode.scrollTop === 0;
		var didReachBottom  = d > 0 && this._scrollNode.scrollTop >= this._getListHeight() - this._getScrollNodeOffsetHeight();

		var doPrevent 		= didReachTop || didReachBottom;

        if (doPrevent) {
        	e.preventDefault();

        	if (!this._didScrollToEnd) {
        		this._didScrollToEnd = true;

        		// There is a chance that there might occour strange rendering issues which
        		// result in a visible, but non existing gap at the top of the list.
        		// "Scrolling" the list by 1 pixel does resolve this issue.

				if (didReachTop) {
        			this._setScrollPosition(1);
        			this._setScrollPosition(0);
        		}
        	}
        }
	},

	_onScroll: function (e) {
		this._requestFrame(this.__onScroll, 'onscroll', e);
	},

	__onScroll: function (e) {
		this._lastScrollPosition = this._scrollNode.scrollTop;

		if (this._scrollNode.scrollTop > this._lastScrollPosition) {
			this._didScrollToEnd = false;
		} else if (this._scrollNode.scrollTop < this._lastScrollPosition) {
			this._didScrollToEnd = false;
		}

		this.__updateCells();
	},

	_scrollToElement: function (element) {
		// Check if element is already rendered. If so,
		// just scroll to it. Done.

		var cell = this._findCellByElement(element);

		if (cell) {
			this._setScrollPosition(this._getCellTop(cell));
			delete this._cachedScrollToElement;
			return;
		}

		// Cell is currently not rendered. Need to estimate
		// its position, scroll to it, render all cells and adjust
		// the estimated position accordingly.

		var index = this._getIndexForElement(element);

		if (index < 0) {
			return;
		}

		var estimatedPosition = index * this._averageCellHeight;
		this._cachedScrollToElement = element;

		if (this._cellsSorted.length === 0) {
			return;
		}

		this._setScrollPosition(estimatedPosition);
	},

	_scrollToCachedScrollElement: function () {
		this._cachedScrollToElement
			? this.scrollToElement(this._cachedScrollToElement)
			: void(0);
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// RAF 						/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	_requestFrame: function (callback, key) {
		if (!this._frameRequests[key]) {
			this._frameRequests[key] = true;
			var args = [].slice.call(arguments, 2);

			window.requestAnimationFrame(function () {
				callback.apply(this, args);
				delete this._frameRequests[key];
			}.bind(this));
		}
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// CELL HANDLING 			/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	// Ensures that at least and only as many cells are rendered as needed.
	// Use on init and whenever the bounds, data or expandings change.

	_maintainCellCount: function () {
		this._requestFrame(this.__maintainCellCount, 'cellcount');
	},

	__maintainCellCount: function () {
		// Add cells as long as the threshold bounds are not reached.

		while(this._getCellsSorted().length === 0 || this._lowestCellHeight * (this._getCells().length - 2) < this._getMinimumListHeight()) {
			var firstRenderIndex 	= this._getFirstRenderIndex();
			var lastRenderIndex  	= this._getLastRenderIndex();
			var placeCellAtBottom 	= lastRenderIndex < this._currentMaxIndex;

			if (lastRenderIndex < this._currentMaxIndex || firstRenderIndex > 0) {
				var index = placeCellAtBottom
					? ++lastRenderIndex
					: --firstRenderIndex;

				index = this.initialScrollToElement && this._getCellsSorted().length === 0
					? this._getIndexForElement(this.initialScrollToElement)
					: index;

				if (index < 0 || index > this._currentMaxIndex) {
					break;
				}

				var cell = this._createCell();
				this._updateCellWithElementAtIndex(cell, index);
				this._updateCellHeight(cell);

				var cellTop = placeCellAtBottom
					? this._getLastCellBottom()
					: this._getFirstCellTop() - this._getCellHeight(cell);

				this._setCellTop(cell, cellTop);
				this._updateCellMeasurements();
				this._updateCellsSorted();
				this._updateListBounds();
			} else {
				break;
			}
		}

		if (this.initialScrollToElement) {
			this.__maintainScrollPositionIntegrity(true);
			this._scrollToElement(this.initialScrollToElement);
			this.initialScrollToElement = undefined;
		}

		// Remove cells if they exceed our buffer or data index range.

		var sortedCells 	= this._getCellsSorted();
		var minListHeight 	= this._getMinimumListHeight();

		for (var i = sortedCells.length - 1; i >= 0; i--) {
			var cell = sortedCells[i];

			if (cell.__index < 0 || cell.__index > this._currentMaxIndex || (i === sortedCells.length - 1 && this._lowestCellHeight * (sortedCells.length - 2) - this._getCellHeight(cell) > minListHeight)) {
				this._listNode.removeChild(cell);
				sortedCells.splice(i, 1);

				this._updateCellMeasurements();
				this._updateListBounds();
			}
		}

		this._updateCellsSorted();
	},

	// Determine, if there is a deviation of the current index of a cell and its
	// future index. If the abs of this deviation is greater than its index in the sorted
	// array, we need to reposition all cells by that index. If ignoreIndex is set,
	// it will estimate the position of the first cell and reposition accodingly.

	__maintainScrollPositionIntegrity: function (ignoreIndex) {
		if (this._cellsSorted.length === 0) {
			return;
		}

		this._updateListBounds();

		var indexDeviation 		= 0;
		var positionDeviation 	= this._getFirstCellTop();
		var scrollTop 			= this._getScrollPosition();
		var hookedCell 			= undefined;

		for (var i = 0; i < this._cellsSorted.length; i++) {
			var cell = this._cellsSorted[i];

			if (ignoreIndex) {
				var estimatedPosition 	= cell.__index * this._averageCellHeight;
				positionDeviation 		= this._getCellTop(cell) - estimatedPosition;
				hookedCell 				= cell;
				break;
			}

			var index = this._getIndexForElement(cell.__element);

			if (index === -1) {
				continue;
			}

			if (index === cell.__index) {
				return;
			}

			indexDeviation = cell.__index - index;

			if (Math.abs(indexDeviation) > i) {
				positionDeviation 	= indexDeviation * this._averageCellHeight;
				hookedCell 			= cell;
				break;
			}
		}

		var prevCellBottom;
		for (var i = 0; i < this._cellsSorted.length; i++) {
			var cell 	= this._cellsSorted[i];
			var cellTop = ignoreIndex && prevCellBottom !== undefined
							? prevCellBottom
							: this._getCellTop(cell) - positionDeviation;

			cell.__index -= indexDeviation; // Kind of dirty here, but yeah.. well.. fck it.
			this._setCellTop(cell, cellTop);
			prevCellBottom = cellTop + this._getCellHeight(cell);
		}

		this._updateListBounds();
		this._setScrollPosition(scrollTop - positionDeviation);
		return hookedCell;
	},

	// Updates lowest cell height and current average cell height.
	// These numbers are used to determine the amount of cells and the scroll height.

	_updateCellMeasurements: function () {
		var cells 				= this._getCells();
		var totalCellHeight 	= 0;
		this._lowestCellHeight 	= Number.MAX_VALUE;

		for (var i = 0; i < cells.length; i++) {
			var cellHeight 	= this._getCellHeight(cells[i]);
			totalCellHeight+= cellHeight;
			this._lowestCellHeight = Math.min(this._lowestCellHeight, cellHeight);
		}

		this._averageCellHeight = totalCellHeight / cells.length;
	},

	// Update a cell at given index. The method will not do anything
	// if the data of the cell matches the data at the index.
	// Returns the cell if an update was performed or nothing, if not.

	_updateCellWithElementAtIndex: function (cell, index) {
		var elementAndLevel = this._getElementAndLevelAtIndex(index);
		cell.__valid = true;

		if (!elementAndLevel) {
			return;
		}

		var element 	= elementAndLevel.element;
		var level 		= elementAndLevel.level;

		if (!element || element === cell.__element) {
			return;
		}

		var expandInformation = this._anyElementHasChildren()
			? this._getExpandInformationForElement(element)
			: undefined;

		var content = this.getCellRenderer
			? this.getCellRenderer.call(this.context, element, index, expandInformation !== undefined, this)
			: '';

		this._disableNodeResizeObserving(cell);

		if (typeof content === 'string' || content instanceof String) {
			cell.__contentEl.innerHTML = content;
		} else {
			cell.__contentEl.innerHTML = '';
			cell.__contentEl.appendChild(content);
		}

		if (this.observeCellBounds) {
			window.requestAnimationFrame(function () {
				this._enableNodeResizeObserving(cell);
			}.bind(this));
		}

		if (expandInformation) {
			cell.classList.add('expanded');
			cell.__expandInformation = expandInformation;
		} else {
			cell.classList.remove('expanded');
			delete cell.__expandInformation;
		}

		cell.dataset.level = level;

		cell.__element 		= element;
		cell.__index 		= index;
		cell.__level 		= level;

		this._emitElementEvents(element, index);

		return cell;
	},

	_updateCells: function (force) {
		this._requestFrame(this.__updateCells, 'updatecells', force);
	},

	__updateCells: function (force) {
		// Get some vars

		var scrollTop 			= this._getScrollPosition();
		var topThreshold 		= this._getTopRenderThreshold();
		var bottomThreshold 	= this._getBottomRenderThreshold();
		var firstCellTop		= this._getFirstCellTop();
		var lastCellBottom 		= this._getLastCellBottom();
		var firstRenderIndex 	= this._getFirstRenderIndex();
		var lastRenderIndex 	= this._getLastRenderIndex();
		var cells 				= this._getCellsSorted();

		var estimated 					= false;
		var iteratingIndex 				= -1;
		var increment 					= 0;
		var iteratingPositition 		= undefined;
		var numUpdatedCells 			= 0;
		var numRepositionedCells 		= 0;
		var needUpdateLowestCellHeight 	= false;

		// Get list position bools relative to thresholds.

		var topCellIsInTopThreshold 			= firstCellTop > scrollTop + topThreshold;
		var topCellIsBeyondBottomThreshold 		= firstCellTop > scrollTop + bottomThreshold;
		var bottomCellIsBeyondTopThreshold 		= lastCellBottom < scrollTop + topThreshold;
		var bottomCellIsInBottomThreshold 		= lastCellBottom < scrollTop + bottomThreshold;

		// We don't want to move cells from top to bottom or vice versa,
		// we just want to iterate over all cells and update them if needed.

		if (force) {
			increment 			= 1;
			iteratingPositition = firstCellTop;
		}

		// Top cell is beyond top and bottom cell beyond bottom threshold,
		// which means we don't need to do anything.

		else if (!topCellIsInTopThreshold && !bottomCellIsInBottomThreshold) {
			return;
		}

		// All cells are completely beyond one of the thresholds, which means we have to estimate
		// a new top and first render index and will update all cells accordingly.

		else if (topCellIsBeyondBottomThreshold || bottomCellIsBeyondTopThreshold) {
			var estimatedIndex 	= Math.round(Math.max(scrollTop + topThreshold, 0) / this._averageCellHeight);
			increment 			= 1;
			iteratingIndex 		= Math.min(estimatedIndex, this._currentMaxIndex - cells.length + 1);
			iteratingPositition = iteratingIndex * this._averageCellHeight;
			estimated 			= true;
		}

		// Bottom cell reached bottom threshold, which means we need to move some cells from
		// the top to the bottom.

		else if (bottomCellIsInBottomThreshold && lastRenderIndex < this._currentMaxIndex) {
			increment 			= 1;
			iteratingIndex 		= lastRenderIndex + increment;
			iteratingPositition = lastCellBottom;
		}

		// Top cell reached top threshold, which means we need to move some cells from
		// the bottom to the top.

		else if (topCellIsInTopThreshold && firstRenderIndex > 0) {
			increment 			= -1;
			iteratingIndex 		= firstRenderIndex + increment;
			iteratingPositition = firstCellTop;
		}

		// None of the above, which means we are done here.

		else {
			return;
		}

		// Loop through all cells now.

		// console.time("update cells");
		for (var i = 0; i < cells.length; i++) {

			// Get cell based on increment. If we want to update the list downwards, iterate ascending,
			// if upwards, iterate descending.

			var cell 			= cells[increment > 0 ? i : cells.length - 1 -i];
			var cellIndex 		= force ? cell.__index : iteratingIndex;
			var didUpdateCell = cellIndex >= 0 && cellIndex <= this._currentMaxIndex
				? this._updateCellWithElementAtIndex(cell, cellIndex)
				: void 0;

			if (force || didUpdateCell) {
				this._updateCellHeight(cell);

				// Updating list from top to bottom.

				if (increment > 0) {
					this._setCellTop(cell, iteratingPositition);
					iteratingPositition += cellIndex > -1 ? this._getCellHeight(cell) : 0;
				}

				// Updating list from bottom to top.

				else if (increment < 0) {
					var topDeviation 	 	= 0;
					iteratingPositition -= cellIndex > -1 ? this._getCellHeight(cell) : 0;

					if (cellIndex === 0 && iteratingPositition !== 0) {
						topDeviation = iteratingPositition;
						iteratingPositition = 0;
					}

					this._setCellTop(cell, iteratingPositition);

					// This happens when we reached the top of the list, but because of estimating and
					// averaging the calculated position of the very first cell with index 0 is not 0.
					// We need to adjust all cells and the scroll position in this case.

					if (topDeviation) {
						this._updateCellsSorted();
						this.__updateCells(true);
						this._setScrollPosition(scrollTop - topDeviation);
						return;
					}
				}

				needUpdateLowestCellHeight = needUpdateLowestCellHeight || (this._getCellHeight(cell) > 0 && this._getCellHeight(cell) < this._lowestCellHeight);
				numRepositionedCells++;
			}

			if (didUpdateCell && !force) {
				iteratingIndex += increment;
				numUpdatedCells++;
			}

			// If we passed the threshold we wanted to pass and we do not want to force
			// an update on all cells, break here.

			if (!force && !estimated && ((increment > 0 && iteratingPositition > scrollTop + bottomThreshold) || (increment < 0 && iteratingPositition < scrollTop + topThreshold))) {
				break;
			}
		}
		// console.timeEnd("update cells");

		// Updated the sorted cells cache and also update list bounds. Don't panic.
		// If there is nothing to update, these are a very cheap function calls.

		this._updateCellsSorted();
		this._updateListBounds();

		// If a cell has a lower height than the current cached lowest height, we might
		// need to fill up the list with new cells.

		if (needUpdateLowestCellHeight || force) {
			this._updateCellMeasurements();
			this.__maintainCellCount();
		}

		// If we wanted to scroll to an element that was not rendered, it might be rendered now.

		this._scrollToCachedScrollElement();
	},

	_findCellByElement: function (element) {
		for (var i = 0; i < this._cellsSorted.length; i++) {
			var cell = this._cellsSorted[i];
			if (cell.__element === element) {
				return cell;
			}
		}
	},

	_cellBoundsUpdated: function () {
		this._requestFrame(function () {
			this.__updateCells(true);
		}.bind(this), 'cellbounds');
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// EXPANDING CELLS			/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	_toggleExpandElement: function (element) {
		var cell = this._findCellByElement(element);

		cell
			? this._toggleExpandCell(cell)
			: void(0);
	},

	_expandElement: function (element) {
		var cell = this._findCellByElement(element);

		cell
			? this._expandCell(cell)
			: void(0);
	},

	_collapseElement: function (element) {
		var cell = this._findCellByElement(element);

		cell
			? this._collapseCell(cell)
			: void(0);
	},

	_isElementExpanded: function (element) {
		var cell = this._findCellByElement(element);

		return cell
			? cell.__expandInformation !== undefined
			: false;
	},

	_toggleExpandCell: function (cell) {
		cell.__expandInformation
			? this._collapseCell(cell)
			: this._expandCell(cell);
	},

	_collapseCell: function (cell) {
		cell.classList.remove('expanded');

		this._removeExpandInformationForCell(cell);
		this._updateCells(true);
	},

	_expandCell: function (cell) {
		cell.classList.add('expanded');

		this._addExpandInformationForCell(cell);
		this._updateCells(true);
	},

	_getExpandInformationForElement: function (element) {
		for (var i = 0; i < this._expandInformations.length; i++) {
			var expandInformation = this._expandInformations[i];
			if (expandInformation.element === element) {
				return expandInformation;
			}
		}
	},

	_createExpandInformationBase: function (element, level) {
		var elementParent 	= this._findExpandedParentItemForElement(element);
		var elementIndex 	= elementParent
								? this._getElementChildren(elementParent).indexOf(element)
								: this._data.indexOf(element);

		return {
			active: 						true,
			element: 						element,
			elementIndex: 					elementIndex,
			elementChildren: 				this._getElementChildren(element),
			elementParent: 				elementParent,
			index: 							undefined,
			level: 							level,
			totalLength: 					0
		}
	},

	_findExpandedParentItemForElement: function (element) {
		for (var i = 0; i < this._expandInformations.length; i++) {
			var info = this._expandInformations[i];

			if (info.elementChildren.indexOf(element) > -1) {
				return info.element;
			}
		}
	},

	_addExpandInformationForCell: function (cell) {
		var info = this._createExpandInformationBase(cell.__element, cell.__level + 1);
		this._expandInformations.push(info);
		cell.__expandInformation = info;

		this._sortExpandInformations();

		if (this.rememberChildrenExpands) {
			for (var i = this._expandInformations.indexOf(info) + 1; i < this._expandInformations.length; i++) {
				var subsequentInfo = this._expandInformations[i];

				if (subsequentInfo.level <= info.level) {
					break;
				}

				subsequentInfo.active = true;
			}
		}

		this._calculateExpandInformationIndexes();
	},

	_removeExpandInformationForCell: function (cell) {
		var info = cell.__expandInformation;

		var infosToDelete = [info];

		for (var i = this._expandInformations.indexOf(info) + 1; i < this._expandInformations.length; i++) {
			var subsequentInfo = this._expandInformations[i];

			if (subsequentInfo.level <= info.level) {
				break;
			}

			infosToDelete.push(subsequentInfo);
		}

		delete cell.__expandInformation;

		for (var i = 0; i < infosToDelete.length; i++) {
			var infoToDel = infosToDelete[i];

			if (infoToDel === info) {
				this.__removeElementFromArray(this._expandInformations, infoToDel);
			} else {
				this.rememberChildrenExpands
					? infoToDel.active = false
					: this.__removeElementFromArray(this._expandInformations, infoToDel);
			}
		}

		this._calculateExpandInformationIndexes();
	},

	// Looks through all expand informations and re-sets their data. If the data item
	// is non existend, delete the information and all its children. Finally, recalculate all indexes.

	_invalidateExpandInformations: function () {
		this._sortExpandInformations();

		var infosToDelete = [];

		for (var i = 0; i < this._expandInformations.length; i++) {
			var info = this._expandInformations[i];

			var data = info.elementParent
				? this._getElementChildren(info.elementParent)
				: this._data;

			var parentIsDeleted = false;
			for (var i2 = 0; i2 < infosToDelete.length; i2++) {
				var deletedInfo = infosToDelete[i2];

				if (deletedInfo.element === info.elementParent) {
					parentIsDeleted = true;
				}
			}

			if (parentIsDeleted || data.indexOf(info.element) === -1) {
				info.elementChildren = [];
				infosToDelete.push(info);
			} else {
				info.elementChildren = this._getElementChildren(info.element);
			}
		}

		for (var i = 0; i < infosToDelete.length; i++) {
			this.__removeElementFromArray(this._expandInformations, infosToDelete[i]);
		}

		this._calculateExpandInformationIndexes();
	},

	_sortExpandInformations: function () {
		var result = [];

		for (var i = 0; i < this._expandInformations.length; i++) {

			var info = this._expandInformations[i];

			// Current iteration item has a parent. We need to find this parent in
			// the list and put the item after, but before the next item that has not
			// this parent or a greater dataIndex that the iteration item.

			if (info.elementParent) {
				var matched 	= false;
				var added 		= false;
				var lastCompare = undefined;

				for (var i2 = 0; i2 < result.length; i2++) {
					var compare = result[i2];

					if ((matched && compare.elementParent === lastCompare.elementParent && compare.elementIndex > info.elementIndex)
					|| 	(matched && compare.elementParent === info.elementParent && compare.elementIndex > info.elementIndex)
					||  (matched && compare.level < info.level)
					||  (compare.elementParent === info.element)) {
						result.splice(i2, 0, info);
						added = true;
						break;
					}

					else if (compare.element === info.elementParent) {
						matched = true;
					}

					lastCompare = compare;
				}

				if (!added) {
					result.push(info);
				}
			}

			// Current iteration item has no parent. We need to find the element, that
			// also has no parent but a greater dataIndex than the item and put the
			// item right before it.

			else {
				var added = false;

				for (var i2 = 0; i2 < result.length; i2++) {
					var compare = result[i2];

					if ((!compare.elementParent && compare.elementIndex > info.elementIndex)
					||  (compare.elementParent === info.element)) {
						result.splice(i2, 0, info);
						added = true;
						break;
					}
				}

				if (!added) {
					result.push(info);
				}
			}
		}

		this._expandInformations = result;
	},

	_calculateExpandInformationIndexes: function () {
		var parents 			= [];
		var last 				= undefined;
		var cumulativeLength 	= 0;

		for (var i = 0; i < this._expandInformations.length; i++) {
			var info = this._expandInformations[i];

			// If the info is inactive, it is useless by now.

			if (!info.active) {
				continue;
			}

			// First, slice / add last to parents so that we only have infos in that array,
			// that actually are parents of the current info.

			if (last) {
				if (info.level > last.level) {
					parents.push(last);
				} else if (info.level < last.level) {
					parents = parents.slice(0, parents.length - (last.level - info.level));
				}
			}

			// Set total length of the current info and add this to all its parents total length.

			info.totalLength = info.elementChildren.length;

			for (var i1 = 0; i1 < parents.length; i1++) {
				parents[i1].totalLength += info.totalLength;
			}

			// Get the direct parent's numbers that are needed to calculate the curent info's index.

			var directParent 			= parents.length > 0 ? parents[parents.length - 1] : undefined;
			var directParentIndex 		= directParent ? directParent.index : undefined;
			var directParentTotalLength = directParent ? (directParent.totalLength - info.totalLength) : 0;
			var directParentLength 		= directParent ? directParent.elementChildren.length : 0;

			// Determine the data index. Pretty easy, now that we have our parent information.

			var dataIndex = parents && parents.length > 0
				? parents[parents.length - 1].elementChildren.indexOf(info.element)
				: this._data.indexOf(info.element);

			// Calculate the index.

			var dpIndex 				= directParentIndex !== undefined ? directParentIndex + 1 : 0;
			var precedingRootsLength 	= info.level === 1 ? cumulativeLength : 0;
			var index 					= directParentTotalLength - directParentLength + dataIndex + dpIndex + precedingRootsLength;

			// Update info.

			info.elementIndex 	= dataIndex;
			info.index 			= index;

			// Update iteratings.

			last 				= info;
			cumulativeLength   += info.elementChildren.length;
		}

		this._updateCurrentMaxIndex();
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// RESPONSIVENESS 			/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	_onResizeList: function (e) {
		this._disableAllCellsResizeObserving();
		this._requestFrame(this.__onResizeList, 'resizelist');
	},

	__onResizeList: function () {
		this.__updateCells(true);
		this.__updateCells();
		this._cacheScrollNodeOffsetHeight();
		this._enableAllCellsResizeObserving();
	},

	_onResizeCell: function (e) {
		this._cellBoundsUpdated();
	},

	_disableNodeResizeObserving: function (node) {
		if (!node.__frame || !node.__frame.contentWindow || !node.__frame.contentWindow.onresize) {
			return;
		}

		node.__frame.contentWindow.__onresize 	= node.__frame.contentWindow.onresize;
		node.__frame.contentWindow.onresize 	= undefined;
	},

	_enableNodeResizeObserving: function (node) {
		if (!this.observeCellBounds || !node.__frame || !node.__frame.contentWindow || !node.__frame.contentWindow.__onresize) {
			return;
		}

		node.__frame.contentWindow.onresize 	= node.__frame.contentWindow.__onresize;
		node.__frame.contentWindow.__onresize 	= undefined;
	},

	_disableAllCellsResizeObserving: function () {
		if (!this.observeCellBounds) {
			return;
		}

		for (var i = 0; i < this._cellsSorted.length; i++) {
			this._disableNodeResizeObserving(this._cellsSorted[i]);
		}
	},

	_enableAllCellsResizeObserving: function () {
		if (!this.observeCellBounds) {
			return;
		}

		for (var i = 0; i < this._cellsSorted.length; i++) {
			this._enableNodeResizeObserving(this._cellsSorted[i]);
		}
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// HELPER					/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

	__removeElementFromArray: function (array, element) {
		return array.splice(array.indexOf(element), 1);
	},
};

return MNSTR;
}));
