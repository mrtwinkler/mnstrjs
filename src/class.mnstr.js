export default class MNSTR {
  /**
   * Construct, reset, destruct.
   */

  constructor (options) {
    // Context in which callbacks will be called
    this.context = this

    // Element this list will be appended to. If not provided, document.body will be used.
    this.parentNode = void 0

    // Required. if you want to display something. Must return an array.
    this.getData = void 0

    // Optional. Used for nested data. If set, must return an array, just like getData.
    this.getElementChildren = void 0

    // Required. Must return a string or HTML element. Params: element, index, isExpanded, this.
    this.getCellRenderer = void 0

    // This needs to be true if the list is used in a VDOM environment like vue oder react.
    this.virtualEnvironment = false

    // Callback that needs to be set in a VDOM environment. Params: Array with elements to render, renderComplete callback.
    this.needUpdateVirtualDOM = void 0

    // If false, the list will not render anything when initialized.
    this.renderOnInitialize = true

    // Element at whichs position the list will initially be rendered. If not set, the list will render at its top.
    this.initialScrollToElement = void 0

    // Options for scrolling to the initial visible element. Possible props are: smooth:boolean, bottom:boolean, offset:float
    this.initialScrollToOptions = void 0

    // If true, an iFrame will be used for each cell to observe if the bounds change. Use this, if cell bounds are highly volatile. Caution: iFrame rendering is very expensive. This might cause initial rendering delays.
    this.observeCellBounds = false

    // If set and an expanded element, which has children that are also expanded, is collapsed and re-expanded, the children will be re-expanded, too.
    this.rememberChildrenExpands = true

    // Thresholds at which cell reusing will be triggered.
    this.thresholdRatio = 0.5

    // Use transform instead of top to position cells. When using transform (default), z-index will break when trying to overlap subsequent cells. Using top will negatively impact performance, since we don't render cells on their own layer anymore.
    this.useTransform = true

    // Define a custom class name for the dom element.
    this.className = 'mnstr'

    // Triggered each time the first element of data is rendered (not neccessarily visible!).
    this.didRenderFirstElement = void 0

    // Triggered each time the last element of data is rendered (not neccessarily visible!).
    this.didRenderLastElement = void 0

    // Triggered each time the first fully visible cell in the viewport has changed.
    this.firstInBoundsElementChanged = void 0

    // Triggered each time the last fully visible cell in the viewport has changed.
    this.lastInBoundsElementChanged = void 0

    // Private

    this._data = []
    this._scrollNode = void 0
    this._listNode = void 0
    this._events = {}
    this._lowestCellHeigh = Number.MAX_VALUE
    this._averageCellHeight = 1
    this._currentMaxIndex = 0
    this._initialScrollToElement = void 0
    this._cachedScrollToElement = void 0
    this._cachedScrollToOptions = void 0
    this._firstInBoundsElement = void 0
    this._lastInBoundsElement = void 0
    this._frameRequests = {}
    this._cellsSorted = []
    this._vElements = []
    this._expandInformations = []
    this._updatingCells = false

    // Init

    options = options || {}

    Object.keys(options).forEach((key) => {
      key.charAt(0) === '_'
        ? delete options[key]
        : void 0
    })

    Object.assign(this, options)

    this._initialScrollToElement = this.initialScrollToElement
    this._cachedScrollToElement = this._initialScrollToElement
    this._cachedScrollToOptions = this.initialScrollToOptions

    this.renderOnInitialize
      ? this.render()
      : void 0
  }

  destroy () {
    console.error('wheeee.')
  }

  async reset () {
    this._data = []
    this._lowestCellHeight = Number.MAX_VALUE
    this._averageCellHeight = 1
    this._currentMaxIndex = 0
    this._cachedScrollToElement = void 0
    this._cachedScrollToOptions = void 0
    this._frameRequests = {}
    this._cellsSorted = []
    this._expandInformations = []
    this._vElements = []

    if (this.virtualEnvironment) {
      await this.updateVirtualDOM()
    } else {
      while (this._listNode.firstChild) {
        this._listNode.removeChild(this._listNode.firstChild)
      }
    }

    this.needUpdate()
    this.setScrollPosition(0)
    this.rUpdateCells()
  }

  exportRestoreState () {
    const first = this.getCellsSorted()[0]

    return {
      scrollTop: this.getScrollPosition(),
      index: first ? first.__index : 0,
      position: first ? this.getNodeTop(first) : 0,
      height: this.getNodeHeight(this._listNode)
    }
  }

  /**
   * DOM rendering
   */

  render (parentNode) {
    this.needUpdate()
    this.renderScrollNode(parentNode)
    this.renderListNode()
    this.initScrollListener()

    this.rAF(async () => {
      await this.updateCells(true)
      this.renderListResizeObserver()
    }, 'render')

    return this
  }

  renderScrollNode (parentNode) {
    this._scrollNode && this._scrollNode.parentNode
      ? this._scrollNode.parentNode.removeChild(this._scrollNode)
      : void 0

    this._scrollNode = document.createElement('div')
    this._scrollNode.classList.add(this.className)
    this._scrollNode.setAttribute('style', 'overflow-y: auto; -webkit-overflow-scrolling: touch; overflow-scrolling: touch; position: relative; will-change: transform;')

    this.parentNode = parentNode || this.parentNode || document.body
    this.parentNode.appendChild(this._scrollNode)
    return this._scrollNode
  }

  renderListNode () {
    this._listNode = document.createElement('ul')
    this._listNode.classList.add(this.className + '-list')
    this._listNode.setAttribute('style', 'position: relative; overflow: hidden; list-style-type: none; margin: 0; padding: 0;')
    this._scrollNode.appendChild(this._listNode)
    return this._listNode
  }

  renderIFrame (parentNode, resizeCallback) {
    const frame = document.createElement('iframe')
    frame.setAttribute('style', 'position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; border: none; opacity: 0; pointer-events: none; touch-action: none; z-index: -1000;')
    frame.onload = (e) => {
      e.target.contentWindow.onresize = resizeCallback.bind(this)
    }
    parentNode.appendChild(frame)
    return frame
  }

  renderListResizeObserver () {
    this._scrollNode.__frameNode = this.renderIFrame(this._scrollNode, this.onResizeScrollNode)
  }

  renderCell () {
    const cell = document.createElement('li')
    cell.classList.add(this.className + '-cell')
    cell.setAttribute('style', 'position: absolute; width: 100%; top: 0; left: 0;')

    cell.__frameNode = this.observeCellBounds
      ? this.renderIFrame(cell, this.onResizeCell)
      : void 0

    const content = document.createElement('div')
    content.classList.add(this.className + '-content')
    content.setAttribute('style', 'width: 100%; margin: 0; border: 0;')
    cell.appendChild(content)
    cell.__contentNode = content

    this._listNode.appendChild(cell)
    return cell
  }

  /**
   * Virtual rendering
   */

  updateVirtualDOM () {
    return new Promise((resolve) => {
      this.needUpdateVirtualDOM.call(this.context, [].concat(this._vElements), () => resolve())
    })
  }

  addVirtualElement (element, index, isExpanded, level) {
    this._vElements
      ? this._vElements.push(this.createVirtualElement(element, index, isExpanded, level))
      : void 0
  }

  removeVirtualElementForCell (cell) {
    if (!this._vElements) {
      return
    }

    const index = this._vElements.findIndex(vElement => vElement.element === cell.__element)

    if (index > -1) {
      this._vElements.splice(index, 1)
      return true
    }
  }

  sortVirtualElements () {
    this._vElements
      ? this._vElements.sort((a, b) => a.index < b.index ? -1 : 1)
      : void 0
  }

  replaceVirtualElementForCell (element, cell, dataIndex, isExpanded, level) {
    this._vElements
      ? this._vElements.splice([].slice.call(this.getCells()).indexOf(cell), 1, this.createVirtualElement(element, dataIndex, isExpanded, level))
      : void 0
  }

  createVirtualElement (element, index, isExpanded, level) {
    return {
      element: element,
      index: index,
      isExpanded: isExpanded,
      level: level
    }
  }

  async syncVDOMToInternalState () {
    // Sort vElements by index
    const sortedVElements = this._vElements.slice(0).sort((a, b) => a.index - b.index)

    if (!sortedVElements.length) {
      await this.updateVirtualDOM()
      this.updateCellsSorted()
      return
    }

    // Get first index
    const firstIndex = sortedVElements[0].index

    // Find cell in sorted cells with that index
    // This cell will be our repositioning starting point
    const cell = this.getCellsSorted().find(cell => cell.__index === firstIndex)

    if (!cell) {
      return
    }

    let position = this.getNodeTop(cell)

    // Update VDOM now

    await this.updateVirtualDOM()
    const cellsDOM = this.getCells()

    for (let i = 0; i < cellsDOM.length; i++) {
      const cell = cellsDOM[i]
      const vElement = this._vElements[i]

      cell.__index = vElement.index
      cell.__element = vElement.element
      cell.__level = vElement.level
      cell.dataset.level = vElement.level
    }

    // Now iterate over updated sorted cells and reposition them

    this.updateCellsSorted().reduce((acc, cell) => {
      this.setNodeTop(cell, acc)
      this.setNodeHeight(cell)
      return acc + this.getNodeHeight(cell)
    }, position)
  }

  /**
   * DOM node queries (non scrolling)
   */

  getNodeHeight (node, computed) {
    if (!node) {
      return 0
    }

    return computed || !node.__nodeHeight
      ? this.setNodeHeight(node, computed)
      : node.__nodeHeight || 0
  }

  setNodeHeight (node, computed, value, applyToNode) {
    value = Math.max(value, 0)

    applyToNode
      ? node.style.height = value + 'px'
      : void 0

    node.__nodeHeight = value || computed ? node.getBoundingClientRect().height : node.offsetHeight
    return node.__nodeHeight
  }

  getNodeTop (node) {
    if (!node) {
      return 0
    }

    return node
      ? node.__nodeTop || 0
      : 0
  }

  setNodeTop (node, value) {
    value = Math.max(value, 0)

    this.useTransform
      ? node.style.transform = 'translateY(' + value + 'px)'
      : node.style.top = value + 'px'

    node.__nodeTop = value
    return node.__nodeTop
  }

  getNodeBottom (node) {
    return node
      ? this.getNodeTop(node) + this.getNodeHeight(node)
      : 0
  }

  /**
   * List queries (non scrolling)
   */

  getMinimumListNodeHeight () {
    const scrollNodeHeight = this.getNodeHeight(this._scrollNode, true)
    return scrollNodeHeight + (scrollNodeHeight * (this.thresholdRatio * 2))
  }

  updateListBounds (force) {
    if (!this._cellsSorted || !this._cellsSorted.length) {
      return
    }

    const lastCell = this._cellsSorted[this._cellsSorted.length - 1]
    const lastCellBottom = this.getNodeBottom(lastCell)
    const listHeight = this.getNodeHeight(this._listNode)
    const scrollIsAtBottom = Math.floor(this._scrollNode.scrollHeight - this.getScrollPosition()) - Math.ceil(this.getNodeHeight(this._scrollNode)) <= 1
    const reachedListEnd = lastCell.__index === this._currentMaxIndex && lastCellBottom - listHeight !== 0

    force || scrollIsAtBottom || reachedListEnd || !listHeight
      ? this.setNodeHeight(this._listNode, false, lastCellBottom + ((this._currentMaxIndex - lastCell.__index) * this._averageCellHeight), true)
      : void 0
  }

  getTopRenderThreshold () {
    return -this.getNodeHeight(this._scrollNode) * this.thresholdRatio
  }

  getBottomRenderThreshold () {
    const scrollNodeHeight = this.getNodeHeight(this._scrollNode)
    return scrollNodeHeight * this.thresholdRatio + scrollNodeHeight
  }

  /**
   * Cell organizer
   */

  getCells () {
    return this._listNode
      ? this._listNode.children
      : void 0
  }

  getCellsSorted () {
    return this._cellsSorted
      ? this._cellsSorted
      : this.updateCellsSorted()
  }

  updateCellsSorted () {
    const cells = this.getCells()

    if (!cells) {
      return
    }

    this._cellsSorted = [].slice.call(cells)
    this._cellsSorted.sort((a, b) => a.__index - b.__index)
    return this._cellsSorted
  }

  /**
   * Events
   */

  addEventListener (key, listener) {
    this._events[key] = this._events[key] || []
    this._events[key].push(listener)
    return this
  }

  removeEventListener (key, listener) {
    if (!this._events[key]) {
      return
    }

    const index = this._events[key].indexOf(listener)

    index > -1
      ? this._events[key].splice(index, 1)
      : void 0
  }

  emitEvent (key) {
    const listeners = this._events[key]
    const args = [].slice.call(arguments, 1)

    listeners && listeners.length > 0
      ? listeners.forEach((listener) => listener.apply(this, args))
      : void 0

    this[key]
      ? this[key].apply(this.context, args)
      : void 0
  }

  emitElementEvents (element, index) {
    index === 0
      ? this.emitEvent('didRenderFirstElement', element, this)
      : void 0

    index === this._currentMaxIndex
      ? this.emitEvent('didRenderLastElement', element, this)
      : void 0
  }

  /**
   * Scrolling
   */

  getScrollPosition () {
    return this._scrollNode
      ? this._scrollNode.scrollTop
      : void 0
  }

  setScrollPosition (value) {
    this._scrollNode
      ? this._scrollNode.scrollTop = value
      : void 0
  }

  initScrollListener () {
    this._scrollNode
      ? this._scrollNode.addEventListener('scroll', e => this.rUpdateCells())
      : void 0
  }

  async scrollToFirstElement () {
    const first = this.getElementAndLevelAtIndex(0)
    await this.scrollToElement(first.element)
  }

  async scrollToLastElement () {
    const last = this.getElementAndLevelAtIndex(this._currentMaxIndex)
    await this.scrollToElement(last.element)
  }

  async scrollToElement (element, options) {
    const opts = Object.assign({
      smooth: false,
      nearest: false,
      bottom: false,
      force: false,
      offset: 0
    }, options)

    // Check if element is already rendered. If so,
    // just scroll to it. Done.

    const cell = this._cellsSorted.find(cell => cell.__element === element)

    // If not, try to reposition cells to match thresholds,
    // it may be that the requested cell will be rendered then.

    if (!cell) {
      await this.updateCells()
    }

    if (cell) {
      const isCompletelyInViewport = this.getNodeTop(cell) > this.getScrollPosition() && this.getNodeBottom(cell) < this.getScrollPosition() + this.getNodeHeight(this._scrollNode)

      if (opts.force || !isCompletelyInViewport) {
        const toBottom = opts.bottom || (opts.nearest && this.getNodeTop(cell) > this.getScrollPosition() + this.getNodeHeight(this._scrollNode) / 2)
        const position = toBottom
          ? this.getNodeTop(cell) - this.getNodeHeight(this._scrollNode) + this.getNodeHeight(cell) + opts.offset
          : this.getNodeTop(cell) + opts.offset

        this.setScrollPosition(position)
      }

      delete this._cachedScrollToElement
      delete this._cachedScrollToOptions
      delete this._initialScrollToElement

      return
    }

    // Cell is currently not rendered. Need to estimate
    // its position, scroll to it, render all cells and adjust
    // the estimated position accordingly.

    const index = this.getIndexForElement(element)

    if (index < 0) {
      return
    }

    this._cachedScrollToElement = element
    this._cachedScrollToOptions = opts

    if (this._cellsSorted.length === 0) {
      return
    }

    this.setScrollPosition(index * this._averageCellHeight)
  }

  async scrollToCachedScrollElement () {
    this._cachedScrollToElement
      ? await this.scrollToElement(this._cachedScrollToElement, this._cachedScrollToOptions)
      : void 0
  }

  /**
    Data handling
  **/

  needUpdate () {
    this._data = this.getData
      ? this.getData.call(this.context, this)
      : []

    this.updateCurrentMaxIndex()
    this.invalidateExpandInformations()
    return this
  }

  update (brutalForce, retainPos) {
    this.needUpdate()
    this.rUpdateCells(true, brutalForce, retainPos)
    return this
  }

  async restoreState (data, parentNode) {
    this.needUpdate()

    if (!this._scrollNode) {
      this.renderScrollNode(parentNode || this.parentNode)
      this.renderListNode()
      this.initScrollListener()
    }

    if (this._currentMaxIndex === -1) {
      return
    }

    const cell = await this.addCell(data.index, data.position)

    if (cell) {
      this.setNodeHeight(this._listNode, false, data.height, true)
      this.setScrollPosition(data.scrollTop)
    }

    delete this._initialScrollToElement
    delete this._cachedScrollToElement

    this.updateCellsAverages()
    this.updateCells()
  }

  getElementAndLevelAtIndex (index) {
    if (!this.canHasChildren()) {
      return this.createElementAndLevelInformation(this._data[index], 0)
    }

    let cumulativeLength = 0

    for (let i = this._expandInformations.length - 1; i >= 0; i--) {
      const info = this._expandInformations[i]

      if (!info.active || info.index >= index) {
        continue
      }

      cumulativeLength += info.elementChildren.length

      if (info.index + cumulativeLength < index) {
        continue
      } else {
        const elementIndex = index - (info.index + cumulativeLength - info.elementChildren.length) - 1
        return this.createElementAndLevelInformation(info.elementChildren[elementIndex], info.level)
      }
    }

    return this.createElementAndLevelInformation(this._data[index - cumulativeLength], 0)
  }

  createElementAndLevelInformation (element, level) {
    return {
      element: element,
      level: level
    }
  }

  updateCurrentMaxIndex () {
    const expandLength = this._expandInformations.reduce((acc, info) => acc + (info.active ? info.elementChildren.length : 0), 0)
    this._currentMaxIndex = this._data.length - 1 + expandLength
  }

  canHasChildren () {
    return this.getElementChildren !== void 0
  }

  getChildrenForElement (element) {
    return this.canHasChildren()
      ? this.getElementChildren.call(this.context, element, this)
      : void 0
  }

  getIndexForElement (element) {
    let index = this._data.indexOf(element)

    /**
     * Found element in root data array. Iterate over expand informations
     * to add preceding informations length to index, then return index.
     */
    if (index > -1) {
      return this._expandInformations.reduce((i, info) => {
        if (info.elementParent) {
          return i
        }

        var infoRootElementIndex = this._data.indexOf(info.element)
        if (infoRootElementIndex < index) {
          i += info.totalLength
        }

        return i
      }, index)
    }

    /**
     * Must iterate over expand informations to find the element.
     * If found, iterate over possible preceding siblings which are expanded
     * and add their length. Then return index.
     */
    return this._expandInformations.reduce((index, info) => {
      if (index > -1) {
        return index
      }

      const indexOfElementInInfoChildren = info.elementChildren.indexOf(element)

      if (indexOfElementInInfoChildren > -1) {
        index = indexOfElementInInfoChildren + info.index + 1 + info.elementChildren.reduce((acc, child, ind) => {
          if (ind >= indexOfElementInInfoChildren) {
            return acc
          }

          const expInfo = this._expandInformations.find(exp => exp.element === child)

          if (expInfo) {
            acc += expInfo.totalLength
          }

          return acc
        }, 0)
      }

      return index
    }, -1)
  }

  /**
    Cell handling
  **/

  async maintainCellCount () {
    const scrollTop = this.getScrollPosition()
    const thresholdTop = scrollTop + this.getTopRenderThreshold()
    const thresholdBot = scrollTop + this.getBottomRenderThreshold()
    const cells = this.getCellsSorted()
    const first = cells[0]
    const last = cells[cells.length - 1]
    const actualListHeight = this.getNodeBottom(last) - this.getNodeTop(first)
    const minimumListHeight = this.getMinimumListNodeHeight()
    const didNotMeetMinimumHeight = minimumListHeight > actualListHeight

    let didChangeAnything = false

    switch (true) {
      // No cells at all. Add one.
      case !first && this._currentMaxIndex > -1:
        const index = this._initialScrollToElement ? this.getIndexForElement(this._initialScrollToElement) : 0
        const cell = await this.addCell(index, 0)

        if (cell) {
          this.setNodeTop(cell, this.getNodeHeight(cell) * index)
          didChangeAnything = true
        }
        break

      // Add cell to bottom if there is no cell or if there is room at the bottom
      case last && last.__index < this._currentMaxIndex && (didNotMeetMinimumHeight || this.getNodeBottom(last) < thresholdBot):
        didChangeAnything = !!await this.addCell(last.__index + 1, this.getNodeBottom(last))
        break

      // Add cell to top if there is room
      case first && first.__index > 0 && (didNotMeetMinimumHeight || this.getNodeTop(first) > thresholdTop):
        didChangeAnything = !!await this.addCell(first.__index - 1, this.getNodeTop(first), true)
        break

      // Remove dispensable cell at the top
      case first && (first.__index < 0 || (this.getNodeBottom(first) < thresholdTop && actualListHeight - this.getNodeHeight(first) > minimumListHeight)):
        didChangeAnything = !!await this.removeCell(first)
        break

      // Remove dispensable cell at the bottom
      case last && (last.__index > this._currentMaxIndex || (this.getNodeTop(last) > thresholdBot && actualListHeight - this.getNodeHeight(last) > minimumListHeight)):
        didChangeAnything = !!await this.removeCell(last)
        break
    }

    if (didChangeAnything) {
      this.updateCellsSorted()
      this.updateCellsAverages()
      this.updateListBounds()

      if (this._initialScrollToElement) {
        await this.scrollToCachedScrollElement()
      }

      await this.updateCells()
      await this.maintainCellCount()
    }
  }

  async addCell (index, position, subtractHeight = false) {
    if (index < 0 || index > this._currentMaxIndex) {
      return
    }

    const cell = this.virtualEnvironment
      ? await this.updateCell(void 0, index)
      : await this.updateCell(this.renderCell(), index)

    if (!cell) {
      return
    }

    cell.__frameNode = this.virtualEnvironment && this.observeCellBounds
      ? this.renderIFrame(cell, this.onResizeCell)
      : cell.__frameNode

    this.setNodeHeight(cell)
    this.setNodeTop(cell, position - (subtractHeight ? this.getNodeHeight(cell) : 0))

    return cell
  }

  async removeCell (cell) {
    if (this.virtualEnvironment) {
      const didRemoveCell = this.removeVirtualElementForCell(cell)
      await this.syncVDOMToInternalState()

      return didRemoveCell
    }

    this._listNode.removeChild(cell)
    return true
  }

  rUpdateCells (force, brutalForce, retainPos) {
    this.rAF(this.updateCells, 'updatecells', force, brutalForce, retainPos)
  }

  async updateCells (force, brutalForce, retainPosOnForce) {
    if (this._updatingCells) {
      return
    }

    this._updatingCells = true

    const scrollTop = this.getScrollPosition()
    const thresholdTop = scrollTop + this.getTopRenderThreshold()
    const thresholdBot = scrollTop + this.getBottomRenderThreshold()
    const cells = this.getCellsSorted().slice(0)
    const forceUpdateListBounds = force
    let forceIterator = {}
    let updatedAnyCell = false

    // Force preparation

    if (force) {
      forceIterator.index = 0
      forceIterator.pos = 0

      if (retainPosOnForce) {
        const indexDeviation = this.findCellIndexDeviation()
        const posDeviation = indexDeviation * this._averageCellHeight
        forceIterator.index = Math.max(0, cells && cells.length ? cells[0].__index + indexDeviation : 0)
        forceIterator.pos = Math.max(0, this.getNodeTop(cells[0]) + posDeviation)
        this.updateListBounds(true)
        this.setScrollPosition(scrollTop + posDeviation)
      } else {
        this.setScrollPosition(0)
      }
    }

    // If we have to estimate, enter force mode and prepare

    if (cells && cells.length && (this.getNodeTop(cells[0]) > thresholdBot || this.getNodeBottom(cells[cells.length - 1]) < thresholdTop)) {
      force = true
      forceIterator.index = Math.min(Math.round(Math.max(thresholdTop, 0) / this._averageCellHeight), this._currentMaxIndex - cells.length + 1)
      forceIterator.pos = Math.max(0, forceIterator.index * this._averageCellHeight + this.getTopRenderThreshold())
    }

    // Core Loop

    for (let i = 0; i < cells.length; i++) {
      const first = cells[0]
      const last = cells[cells.length - 1]
      const cell = cells[i]

      // We force which means we iterate all cells from top to bottom along the force iterator
      if (force) {
        // Special case where we are at the top of the list and new data arrived above that. We have to
        // take into account the discrepancy in the height of the first cell.

        const cellHeight = cell.__index === 0 && forceIterator.index > 0
          ? this.getNodeHeight(cell)
          : 0

        await this.updateCell(cell, forceIterator.index, brutalForce)
        this.setNodeHeight(cell)

        // Adding height discrepancy if needed.

        forceIterator.pos += cellHeight
          ? cellHeight - this.getNodeHeight(cell)
          : 0

        this.setNodeTop(cell, forceIterator.pos)
        forceIterator.index += 1
        forceIterator.pos += this.getNodeHeight(cell)
        updatedAnyCell = true

      // Cell is above top threshold and there is room at the bottom => move to the bottom
      } else if (last.__index < this._currentMaxIndex && this.getNodeBottom(cell) < thresholdTop && this.getNodeBottom(last) < thresholdBot) {
        await this.updateCell(cell, last.__index + 1, brutalForce)
        this.setNodeHeight(cell)
        this.setNodeTop(cell, this.getNodeBottom(last))
        cells.push(cells.shift())
        updatedAnyCell = true

      // Cell is below bottom threshold and there is room at the top => move to the top
      } else if (i === cells.length - 1 && first.__index > 0 && this.getNodeTop(cell) > thresholdBot && this.getNodeTop(first) > thresholdTop) {
        await this.updateCell(cell, first.__index - 1, brutalForce)
        this.setNodeHeight(cell)
        this.setNodeTop(cell, this.getNodeTop(first) - this.getNodeHeight(cell))
        cells.unshift(cells.pop())
        updatedAnyCell = true

        // Special cases for reaching scroll top 0 or data index 0

        switch (true) {
          // Reached top cell but there is space left
          case cell.__index === 0 && this.getNodeTop(cell) > 0:
            const deviation1 = this.getNodeTop(cell)
            force = true
            forceIterator.index = cell.__index
            forceIterator.pos = 0
            this.setScrollPosition(scrollTop - deviation1)
            i = -1
            break

          // Reached top position. make sure there is enough space
          case this.getNodeTop(cell) === 0:
            const deviation = this._averageCellHeight * cell.__index
            force = true
            forceIterator.index = cell.__index
            forceIterator.pos = deviation
            this.setScrollPosition(scrollTop + deviation)
            i = -1
            break

          default:
            i--
        }
      }
    }

    // Aftermath

    if (!cells || !cells.length || updatedAnyCell) {
      this.updateCellsSorted()
      await this.maintainCellCount()
      this.updateCellsAverages()
      this.emitEvent('cellsUpdated', this.getCellsSorted(), this)
    }

    this.updateListBounds(forceUpdateListBounds)
    this.scrollToCachedScrollElement()
    this.updateFirstAndLastCellInViewport()
    this._updatingCells = false
  }

  async updateCell (cell, index, brutalForce) {
    const elementAndLevel = this.getElementAndLevelAtIndex(index)

    if (!elementAndLevel) {
      return
    }

    const element = elementAndLevel.element
    const level = elementAndLevel.level

    if (!element || (cell && element === cell.__element && !brutalForce)) {
      if (cell && element === cell.__element) {
        cell.__index = index
        cell.__level = level
        cell.dataset.level = level
      }
      return
    }

    const expandInformation = this.canHasChildren()
      ? this.getExpandInformationForElement(element)
      : void 0

    cell
      ? this.disableNodeResizeObserving(cell)
      : void 0

    if (!this.virtualEnvironment) {
      const content = this.getCellRenderer
        ? this.getCellRenderer.call(this.context, element, index, expandInformation !== void 0, this)
        : ''

      if (typeof content === 'string' || content instanceof String) {
        cell.__contentNode.innerHTML = content
      } else {
        cell.__contentNode.innerHTML = ''
        cell.__contentNode.appendChild(content)
      }
    } else {
      cell
        ? this.replaceVirtualElementForCell(element, cell, index, expandInformation !== void 0, level)
        : this.addVirtualElement(element, index, expandInformation !== void 0, level)

      await this.updateVirtualDOM()

      if (!cell) {
        const cells = this.getCells()
        cell = cells[cells.length - 1]
      }
    }

    this.observeCellBounds
      ? this.rAF(this.enableNodeResizeObserving, false, cell)
      : void 0

    expandInformation
      ? cell.classList.add('expanded')
      : cell.classList.remove('expanded')

    cell.dataset.level = level
    cell.__element = element
    cell.__index = index
    cell.__level = level

    this.emitElementEvents(element, index)
    return cell
  }

  findCellIndexDeviation () {
    for (let i = 0; i < this._cellsSorted.length; i++) {
      const cell = this._cellsSorted[i]
      const index = this.getIndexForElement(cell.__element)

      if (index === -1) {
        continue
      }

      if (index === cell.__index) {
        return 0
      }

      return index - cell.__index
    }

    return 0
  }

  updateCellsAverages () {
    const cells = this.getCells()
    let totalCellHeight = 0
    this._lowestCellHeight = Number.MAX_VALUE

    for (let i = 0; i < cells.length; i++) {
      const cellHeight = this.getNodeHeight(cells[i])
      totalCellHeight += cellHeight
      this._lowestCellHeight = this._lowestCellHeight === 0
        ? cellHeight
        : Math.min(this._lowestCellHeight, cellHeight)
    }

    this._averageCellHeight = totalCellHeight / cells.length
  }

  cellBoundsUpdated () {
    this.rUpdateCells(true, false, true)
  }

  updateFirstAndLastCellInViewport () {
    const scrollTop = this.getScrollPosition()
    const listSize = this.getNodeHeight(this._scrollNode)

    const cells = this.getCellsSorted()
    const bottomBound = scrollTop + listSize
    const chunkSize = Math.max(1, Math.round(cells.length / 5))
    let firstInBoundsIndex = -1
    let lastInBoundsIndex = -1

    for (let i = 0; i < cells.length; i += chunkSize) {
      const cell = cells[i]

      if (this.getNodeTop(cell) > scrollTop) {
        firstInBoundsIndex = Math.max(0, i - chunkSize)
        break
      }
    }

    if (firstInBoundsIndex > -1) {
      while (true) {
        const cell = cells[firstInBoundsIndex]

        if (this.getNodeTop(cell) >= scrollTop) {
          break
        } else {
          firstInBoundsIndex++
        }
      }

      lastInBoundsIndex = firstInBoundsIndex

      while (true) {
        const cell = cells[lastInBoundsIndex]

        if (!cell || this.getNodeTop(cell) + this.getNodeHeight(cell) >= bottomBound) {
          lastInBoundsIndex--
          break
        } else {
          lastInBoundsIndex++
        }
      }

      if (firstInBoundsIndex < 0 || lastInBoundsIndex < 0) {
        return
      }

      const firstInBoundsElement = cells[firstInBoundsIndex].__element
      const lastInBoundsElement = cells[lastInBoundsIndex].__element

      if (firstInBoundsElement !== this._firstInBoundsElement) {
        this._firstInBoundsElement = firstInBoundsElement
        this.emitEvent('firstInBoundsElementChanged', this._firstInBoundsElement, this)
      }

      if (lastInBoundsElement !== this._lastInBoundsElement) {
        this._lastInBoundsElement = lastInBoundsElement
        this.emitEvent('lastInBoundsElementChanged', this._lastInBoundsElement, this)
      }
    }
  }

  /**
    Responsiveness
  **/

  onResizeScrollNode (e) {
    this.disableAllCellsResizeObserving()
    this.rAF(async () => {
      await this.updateCells(true, false, true)
      this.setNodeHeight(this._scrollNode)
      this.enableAllCellsResizeObserving()
    }, 'resizelist')
  }

  onResizeCell (e) {
    this.cellBoundsUpdated()
  }

  disableNodeResizeObserving (node) {
    if (!node.__frameNode || !node.__frameNode.contentWindow || !node.__frameNode.contentWindow.onresize) {
      return
    }

    node.__frameNode.contentWindow.__onresize = node.__frameNode.contentWindow.onresize
    node.__frameNode.contentWindow.onresize = void 0
  }

  enableNodeResizeObserving (node) {
    if (!this.observeCellBounds || !node.__frameNode || !node.__frameNode.contentWindow || !node.__frameNode.contentWindow.__onresize) {
      return
    }

    node.__frameNode.contentWindow.onresize = node.__frameNode.contentWindow.__onresize
    node.__frameNode.contentWindow.__onresize = void 0
  }

  disableAllCellsResizeObserving () {
    this.observeCellBounds
      ? this.getCellsSorted().forEach(cell => this.disableNodeResizeObserving(cell))
      : void 0
  }

  enableAllCellsResizeObserving () {
    this.observeCellBounds
      ? this.getCellsSorted().forEach(cell => this.enableNodeResizeObserving(cell))
      : void 0
  }

  /**
    Expanding / collapsing elements
  **/

  isElementExpanded (element) {
    return this.getExpandInformationForElement(element) !== void 0
  }

  expandElement (element) {
    this.addExpandInformationForElement(element)
    this.updateCells(true, false, true)
  }

  collapseElement (element) {
    this.removeExpandInformationForElement(element)
    this.updateCells(true, false, true)
  }

  toggleExpandElement (element) {
    this.isElementExpanded(element)
      ? this.collapseElement(element)
      : this.expandElement(element)
  }

  getExpandInformationForElement (element) {
    return this._expandInformations.find(info => info.element === element)
  }

  getExpandInformationForElementParent (element) {
    return this._expandInformations.find(info => info.elementChildren.indexOf(element) > -1)
  }

  createExpandInformation (element) {
    const parentInfo = this.getExpandInformationForElementParent(element)

    return {
      active: true,
      element: element,
      elementIndex: parentInfo ? parentInfo.elementChildren.indexOf(element) : this._data.indexOf(element),
      elementChildren: this.getChildrenForElement(element),
      elementParent: parentInfo ? parentInfo.element : void 0,
      index: this.getIndexForElement(element),
      level: parentInfo ? parentInfo.level + 1 : 1,
      totalLength: 0
    }
  }

  addExpandInformationForElement (element) {
    const info = this.createExpandInformation(element)
    this._expandInformations.push(info)
    this.invalidateExpandInformations()

    if (this.rememberChildrenExpands) {
      for (let i = this._expandInformations.indexOf(info) + 1; i < this._expandInformations.length; i++) {
        const subsequentInfo = this._expandInformations[i]
        const previousInfo = this._expandInformations[i - 1]

        if (previousInfo.active && previousInfo.element === subsequentInfo.elementParent) {
          subsequentInfo.active = true
        }
      }
    }
    this.invalidateExpandInformations()
  }

  removeExpandInformationForElement (element) {
    const info = this.getExpandInformationForElement(element)
    const infosToDelete = [info]

    for (let i = this._expandInformations.indexOf(info) + 1; i < this._expandInformations.length; i++) {
      const subsequentInfo = this._expandInformations[i]

      if (subsequentInfo.level <= info.level) {
        break
      }

      infosToDelete.push(subsequentInfo)
    }

    for (let i = 0; i < infosToDelete.length; i++) {
      const infoToDel = infosToDelete[i]

      if (infoToDel === info) {
        this.removeElementFromArray(this._expandInformations, infoToDel)
      } else {
        this.rememberChildrenExpands
          ? infoToDel.active = false
          : this.removeElementFromArray(this._expandInformations, infoToDel)
      }
    }

    this.invalidateExpandInformations()
  }

  invalidateExpandInformations () {
    // Sort

    this._expandInformations.sort((i1, i2) => i1.index - i2.index)

    // Remove abandoned

    const infosToDelete = []

    for (let i = 0; i < this._expandInformations.length; i++) {
      const info = this._expandInformations[i]
      const data = info.elementParent
        ? this.getChildrenForElement(info.elementParent)
        : this._data
      let parentIsDeleted = false

      for (let i2 = 0; i2 < infosToDelete.length; i2++) {
        parentIsDeleted = infosToDelete[i2].element === info.elementParent || parentIsDeleted
      }

      if (parentIsDeleted || data.indexOf(info.element) === -1) {
        info.elementChildren = []
        infosToDelete.push(info)
      } else {
        info.elementChildren = this.getChildrenForElement(info.element)
      }
    }

    for (let i = 0; i < infosToDelete.length; i++) {
      this.removeElementFromArray(this._expandInformations, infosToDelete[i])
    }

    // Recalculate indexes
    this.calculateExpandInformationIndexes()
  }

  calculateExpandInformationIndexes () {
    let parents = []
    let last = void 0
    let cumulativeLength = 0

    for (let i = 0; i < this._expandInformations.length; i++) {
      const info = this._expandInformations[i]

      // If the info is inactive, it is useless by now.

      if (!info.active) {
        continue
      }

      // First, slice / add last to parents so that we only have infos in that array,
      // that actually are parents of the current info.

      if (last) {
        info.level > last.level
          ? parents.push(last)
          : void 0

        info.level < last.level
          ? parents = parents.slice(0, parents.length - (last.level - info.level))
          : void 0
      }

      // Set total length of the current info and add this to all its parents total length.

      info.totalLength = info.elementChildren.length

      for (let i1 = 0; i1 < parents.length; i1++) {
        parents[i1].totalLength += info.totalLength
      }

      // Get the direct parent's numbers that are needed to calculate the curent info's index.

      const directParent = parents.length > 0 ? parents[parents.length - 1] : void 0
      const directParentIndex = directParent ? directParent.index : void 0
      const directParentTotalLength = directParent ? (directParent.totalLength - info.totalLength) : 0
      const directParentLength = directParent ? directParent.elementChildren.length : 0

      // Determine the data index. Pretty easy, now that we have our parent information.

      const dataIndex = parents && parents.length > 0
        ? parents[parents.length - 1].elementChildren.indexOf(info.element)
        : this._data.indexOf(info.element)

      // Calculate the index.

      const dpIndex = directParentIndex !== undefined ? directParentIndex + 1 : 0
      const precedingRootsLength = info.level === 1 ? cumulativeLength : 0
      const index = directParentTotalLength - directParentLength + dataIndex + dpIndex + precedingRootsLength

      // Update info.

      info.elementIndex = dataIndex
      info.index = index

      // Update iteratings.

      last = info
      cumulativeLength += info.elementChildren.length
    }

    this.updateCurrentMaxIndex()
  }

  /**
    Helper
  **/

  rAF (callback, key) {
    const args = [].slice.call(arguments, 2)

    if (this.virtualEnvironment) {
      callback.apply(this, args)
      return
    }

    if (!key) {
      window.requestAnimationFrame(() => callback.apply(this, args))
      return
    }

    this._frameRequests[key]
      ? window.cancelAnimationFrame(this._frameRequests[key])
      : void 0

    this._frameRequests[key] = window.requestAnimationFrame(() => {
      callback.apply(this, args)
      delete this._frameRequests[key]
    })
  }

  removeElementFromArray (array, element) {
    const index = array
      ? array.indexOf(element)
      : -1

    return index > -1
      ? array.splice(index, 1)
      : void 0
  }
}
