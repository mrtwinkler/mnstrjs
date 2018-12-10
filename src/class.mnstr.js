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

    // If true, an iFrame will be used for each cell to observe if the bounds change. Use this, if cell bounds are highly volatile. Caution: iFrame rendering is very expensive. This might cause initial rendering delays.
    this.observeCellBounds = false

    // If set and an expanded element, which has children that are also expanded, is collapsed and re-expanded, the children will be re-expanded, too.
    this.rememberChildrenExpands = true

    // Thresholds at which cell reusing will be triggered.
    this.thresholdRatio = 0.5

    // If true, parent containers will not scroll if the wheel-event is triggered on this list. Strangely, this causes rendering issues when resizing cells manually. So it's set to false by default.
    this.preventWheelBubbling = false

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
    this._lastScrollPosition = 0
    this._lowestCellHeigh = Number.MAX_VALUE
    this._averageCellHeight = 1
    this._currentMaxIndex = 0
    this._initialScrollToElement = void 0
    this._cachedScrollToElement = void 0
    this._firstInBoundsElement = void 0
    this._lastInBoundsElement = void 0
    this._frameRequests = {}
    this._cellsSorted = []
    this._vElements = []
    this._expandInformations = []
    this._didScrollToBounds = false
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

    this.renderOnInitialize
      ? this.render()
      : void 0
  }

  destroy () {
    console.error('wheeee.')
  }

  async reset () {
    this._data = []
    this._lastScrollPosition = 0
    this._lowestCellHeight = Number.MAX_VALUE
    this._averageCellHeight = 1
    this._currentMaxIndex = 0
    this._cachedScrollToElement = void 0
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
    this._scrollNode.setAttribute('style', 'overflow-y: auto; -webkit-overflow-scrolling: touch; overflow-scrolling: touch; position: relative;')

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
      this.needUpdateVirtualDOM.call(this.context, this._vElements, () => resolve())
    })
  }

  addVirtualElement (element, index, isExpanded, level) {
    this._vElements
      ? this._vElements.push(this.createVirtualElement(element, index, isExpanded, level))
      : void 0
  }

  removeVirtualElementForCell (cell) {
    this._vElements
      ? this._vElements.splice(this._cellsSorted.indexOf(cell), 1)
      : void 0
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

  syncCellSortingWithDOM (position, dataIndex) {
    const cells = this.getCells()

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]

      position !== void 0
        ? this.setNodeTop(cell, position)
        : void 0

      cell.__index = dataIndex

      position = position || 0
      position += this.getNodeHeight(cell)
      dataIndex++
    }
  }

  /**
   * DOM node queries (non scrolling)
   */

  getNodeHeight (node, computed) {
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
    // node.__nodeHeight = value || computed ? parseFloat(window.getComputedStyle(node).height) : node.clientHeight
    return node.__nodeHeight
  }

  getNodeTop (node) {
    return node.__nodeTop || 0
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
    return this.getNodeTop(node) + this.getNodeHeight(node)
  }

  getFirstCellTop () {
    return this._cellsSorted && this._cellsSorted.length > 0
      ? this.getNodeTop(this._cellsSorted[0])
      : 0
  }

  getLastCellBottom () {
    return this._cellsSorted && this._cellsSorted.length > 0
      ? this.getNodeBottom(this._cellsSorted[this._cellsSorted.length - 1])
      : 0
  }

  /**
   * List queries (non scrolling)
   */

  getMinimumListNodeHeight () {
    const scrollNodeHeight = this.getNodeHeight(this._scrollNode, true)
    return scrollNodeHeight + (scrollNodeHeight * (this.thresholdRatio * 2))
  }

  updateListBounds () {
    const lastCellBottom = this.getLastCellBottom()
    const listHeight = this.getNodeHeight(this._listNode)

    if (this.getLastRenderIndex() === this._currentMaxIndex) {
      if (lastCellBottom - listHeight !== 0) {
        this.setNodeHeight(this._listNode, false, lastCellBottom, true)
      }
    } else {
      const estimatedHeight = this._averageCellHeight * (this._currentMaxIndex + 1)
      const height = Math.max(lastCellBottom, estimatedHeight)

      height !== listHeight
        ? this.setNodeHeight(this._listNode, false, height, true)
        : void 0
    }
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
    return this._listNode.children
  }

  getCellsSorted () {
    return this._cellsSorted
      ? this._cellsSorted
      : this.updateCellsSorted()
  }

  updateCellsSorted () {
    const cells = this.getCells()
    this._cellsSorted = [].slice.call(cells)
    this._cellsSorted.sort((a, b) => a.__index - b.__index)
    return this._cellsSorted
  }

  getFirstRenderIndex () {
    return this._cellsSorted && this._cellsSorted.length > 0
      ? this._cellsSorted[0].__index
      : -1
  }

  getLastRenderIndex () {
    return this._cellsSorted && this._cellsSorted.length > 0
      ? this._cellsSorted[this._cellsSorted.length - 1].__index
      : -1
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
    return this._scrollNode.scrollTop
  }

  setScrollPosition (value) {
    this._scrollNode.scrollTop = value
  }

  initScrollListener () {
    this._scrollNode.addEventListener('scroll', (e) => this.rAF(this.onScroll, 'onscroll', e))

    this.preventWheelBubbling
      ? this._scrollNode.addEventListener('wheel', this.onWheel)
      : void 0
  }

  onWheel (e) {
    const d = e.deltaY
    const didReachTop = d < 0 && this._scrollNode.scrollTop === 0
    const didReachBottom = d > 0 && this._scrollNode.scrollTop >= this.getNodeHeight(this._listNode) - this.getNodeHeight(this._scrollNode)
    this._didScrollToBounds = didReachTop || didReachBottom

    this._didScrollToBounds
      ? e.preventDefault()
      : void 0

    // There is a chance that there might occour strange rendering issues which
    // result in a visible, but non existing gap at the top of the list.
    // "Scrolling" the list by 1 pixel does resolve this issue.

    if (didReachTop) {
      this.setScrollPosition(1)
      this.setScrollPosition(0)
    }
  }

  onScroll (e) {
    this._lastScrollPosition = this._scrollNode.scrollTop
    this._didScrollToBounds = this._scrollNode.scrollTop <= this._lastScrollPosition || this._scrollNode.scrollTop >= this._lastScrollPosition
    this.rUpdateCells()
  }

  scrollToFirstElement () {
    const first = this.getElementAndLevelAtIndex(0)
    this.scrollToElement(first.element)
  }

  scrollToLastElement () {
    const last = this.getElementAndLevelAtIndex(this._currentMaxIndex)
    this.scrollToElement(last.element)
  }

  scrollToElement (element) {
    this.rAF(async () => {
      // Check if element is already rendered. If so,
      // just scroll to it. Done.

      const cell = this.findCellByElement(element)

      // If not, try to reposition cells to match thresholds,
      // it may be that the requested cell will be rendered then.

      if (!cell) {
        await this.updateCells()
      }

      if (cell) {
        this.setScrollPosition(this.getNodeTop(cell))
        delete this._cachedScrollToElement
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

      if (this._cellsSorted.length === 0) {
        return
      }

      this.setScrollPosition(index * this._averageCellHeight)
    })
  }

  scrollToCachedScrollElement () {
    this._cachedScrollToElement
      ? this.scrollToElement(this._cachedScrollToElement)
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

  update (forceUpdate, retainPosition) {
    this.needUpdate()
    this.rUpdateCells(true, forceUpdate, retainPosition)
    return this
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
    let expandLength = 0

    for (let i = 0; i < this._expandInformations.length; i++) {
      const expandInformation = this._expandInformations[i]

      expandLength += expandInformation.active
        ? expandInformation.elementChildren.length
        : 0
    }

    this._currentMaxIndex = this._data.length - 1 + expandLength
  }

  canHasChildren () {
    return this.getElementChildren !== void 0
  }

  getElementChildren (element) {
    return this.canHasChildren()
      ? this.getElementChildren.call(this.context, element, this)
      : void 0
  }

  getIndexForElement (element) {
    let elementIndex = this._data.indexOf(element)

    let data = elementIndex > -1
      ? this._data
      : void 0

    let matchingInfo = void 0
    let matchingInfoIndex = 0
    let cumulativeLength = 0

    for (let i = 0; i < this._expandInformations.length; i++) {
      const info = this._expandInformations[i]

      if (data === this._data && !info.elementParent && info.index >= elementIndex) {
        break
      }

      if (!data) {
        const index = info.elementChildren.indexOf(element)

        if (index > -1) {
          elementIndex = index
          data = info.elementChildren
          matchingInfo = info
          matchingInfoIndex = info.index + 1
          cumulativeLength = 0
          continue
        }
      }

      if (matchingInfo && info.level > matchingInfo.level) {
        const possibleIndex = matchingInfoIndex + elementIndex

        if (possibleIndex <= info.index) {
          return possibleIndex
        } else {
          cumulativeLength += info.elementChildren.length
        }
      } else if (matchingInfo) {
        return matchingInfoIndex + elementIndex + cumulativeLength
      } else {
        cumulativeLength += info.elementChildren.length
      }
    }

    return elementIndex > -1
      ? elementIndex + cumulativeLength + matchingInfoIndex
      : elementIndex
  }

  /**
    Cell handling
  **/

  async addCellsIfNeeded () {
    let didAddCell = false

    while (this.getCellsSorted().length === 0 || this._lowestCellHeight * (this.getCells().length - 2) < this.getMinimumListNodeHeight()) {
      let firstRenderIndex = this.getFirstRenderIndex()
      let lastRenderIndex = this.getLastRenderIndex()
      const placeCellAtBottom = lastRenderIndex < this._currentMaxIndex

      if (lastRenderIndex >= this._currentMaxIndex && firstRenderIndex <= 0) {
        break
      }

      let index = placeCellAtBottom
        ? ++lastRenderIndex
        : --firstRenderIndex

      index = this._initialScrollToElement && this.getCellsSorted().length === 0
        ? this.getIndexForElement(this._initialScrollToElement)
        : index

      if (index < 0 || index > this._currentMaxIndex) {
        break
      }

      let cell = !this.virtualEnvironment
        ? this.renderCell()
        : void 0

      cell = await this.updateCell(cell, index)

      cell.__frameNode = this.virtualEnvironment && this.observeCellBounds
        ? this.renderIFrame(cell, this.onResizeCell)
        : cell.__frameNode

      this.setNodeHeight(cell)

      let cellTop = placeCellAtBottom
        ? this.getLastCellBottom()
        : this.getFirstCellTop() - this.getNodeHeight(cell)

      this.setNodeTop(cell, cellTop)
      this.updateCellsAverages()
      this.updateCellsSorted()
      this.updateListBounds()

      didAddCell = true
    }

    if (this._initialScrollToElement) {
      let top = this.getFirstRenderIndex() * this._averageCellHeight
      const cells = this.getCellsSorted()

      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]
        this.setNodeTop(c, top)
        top += this.getNodeHeight(c)
      }

      this.updateListBounds()
    }

    return didAddCell
  }

  async removeCellsIfNeeded () {
    const sortedCells = this.getCellsSorted()
    const minListHeight = this.getMinimumListNodeHeight()
    let didRemoveCell = false

    for (let i = sortedCells.length - 1; i >= 0; i--) {
      const cell = sortedCells[i]

      if (cell.__index < 0 || cell.__index > this._currentMaxIndex || (i === sortedCells.length - 1 && this._lowestCellHeight * (sortedCells.length - 2) - this.getNodeHeight(cell) > minListHeight)) {
        this.virtualEnvironment
          ? this.removeVirtualElementForCell(cell)
          : this._listNode.removeChild(cell)

        sortedCells.splice(i, 1)
        didRemoveCell = true
      }
    }

    if (this.virtualEnvironment && this._vElements && this._vElements.length !== this.getCells().length) {
      if (sortedCells.length > 0) {
        const firstCellTop = this.getNodeTop(sortedCells[0])
        const firstCellDataIndex = sortedCells[0].__index

        this.sortVirtualElements()
        await this.updateVirtualDOM()
        this.syncCellSortingWithDOM(firstCellTop, firstCellDataIndex)
      } else {
        await this.updateVirtualDOM()
      }
    }

    this.updateCellsSorted()
    this.updateCellsAverages()
    this.updateListBounds()

    return didRemoveCell
  }

  rUpdateCells (needUpdateAllCells, forceReRender, retainPosition, preventNeedRepositioning) {
    this.rAF(this.updateCells, 'updatecells', needUpdateAllCells, forceReRender, retainPosition, preventNeedRepositioning)
  }

  async updateCells (needUpdateAllCells, forceReRender, retainPosition, preventNeedRepositioning) {
    if (this._updatingCells) {
      return
    }

    const scrollTop = this.getScrollPosition()
    const topThreshold = this.getTopRenderThreshold()
    const bottomThreshold = this.getBottomRenderThreshold()
    const firstCellTop = this.getFirstCellTop()
    const lastCellBottom = this.getLastCellBottom()
    const firstRenderIndex = this.getFirstRenderIndex()
    const lastRenderIndex = this.getLastRenderIndex()
    const topCellIsInTopThreshold = firstCellTop > scrollTop + topThreshold
    const topCellIsBeyondBottomThreshold = firstCellTop > scrollTop + bottomThreshold
    const bottomCellIsBeyondTopThreshold = lastCellBottom < scrollTop + topThreshold
    const bottomCellIsInBottomThreshold = lastCellBottom < scrollTop + bottomThreshold

    let dataIndex = 0
    let dataIndexInc = 1
    let position = 0
    let needRePositioning = false
    let updatingAllCells = false
    let didUpdateAnyCell = false

    if (!topCellIsInTopThreshold && !bottomCellIsInBottomThreshold && !needUpdateAllCells) {
      // Top cell is beyond top and bottom cell beyond bottom threshold,
      // which means we don't need to do anything. Unless we want to iterate all cells anyway.
      this.updateFirstAndLastCellInViewport()
      return
    } else if (topCellIsBeyondBottomThreshold || bottomCellIsBeyondTopThreshold) {
      // All cells are completely beyond one of the thresholds, which means we have to estimate
      // a new top and first render index and will update all cells accordingly.
      const estimatedIndex = Math.round(Math.max(scrollTop + topThreshold, 0) / this._averageCellHeight)
      dataIndex = Math.min(estimatedIndex, this._currentMaxIndex - this.getCellsSorted().length + dataIndexInc)
      position = dataIndex * this._averageCellHeight
      updatingAllCells = true
    } else if (bottomCellIsInBottomThreshold && lastRenderIndex < this._currentMaxIndex && !preventNeedRepositioning) {
      // Bottom cell reached bottom threshold, which means we need to move some cells from
      // the top to the bottom.
      dataIndex = lastRenderIndex + dataIndexInc
      position = lastCellBottom
      needRePositioning = true
    } else if (topCellIsInTopThreshold && (firstRenderIndex > 0 || needUpdateAllCells) && !preventNeedRepositioning) {
      // Top cell reached top threshold, which means we need to move some cells from
      // the bottom to the top.
      dataIndexInc = -1
      dataIndex = firstRenderIndex + dataIndexInc
      position = firstCellTop
      needRePositioning = true
    } else if (needUpdateAllCells) {
      dataIndex = firstRenderIndex
      position = firstCellTop
      updatingAllCells = true
    } else {
      this.updateFirstAndLastCellInViewport()
      return
    }

    this._updatingCells = true

    let positionDeviation = 0

    if (needUpdateAllCells) {
      if (retainPosition) {
        const indexDeviation = this.findCellIndexDeviation()
        positionDeviation = Math.round(indexDeviation * this._averageCellHeight)
        dataIndex += indexDeviation

        if (bottomCellIsInBottomThreshold && lastRenderIndex + indexDeviation >= this._currentMaxIndex) {
          dataIndex = firstRenderIndex + indexDeviation
          position = firstCellTop
        }
      } else {
        dataIndex = 0
        position = 0
        needRePositioning = false
        updatingAllCells = true
        needUpdateAllCells = false
        this.setScrollPosition(0)
      }
    }

    // In the first step, shift cells so that we exceed both thresholds. (if possible).
    // If we want to update all cells and retain the scroll position,
    // we only update the shifted cells indexes in this step. This involves no DOM operations.

    didUpdateAnyCell = await this.updateCellsCore(dataIndex, dataIndexInc, position, forceReRender, needRePositioning, needUpdateAllCells, updatingAllCells, scrollTop, topThreshold, bottomThreshold)

    if (needUpdateAllCells && retainPosition) {
      dataIndex = dataIndexInc > 0
        ? this.getFirstRenderIndex()
        : this.getLastRenderIndex()

      position = dataIndexInc > 0
        ? this.getFirstCellTop() + positionDeviation
        : this.getLastCellBottom() + positionDeviation

      didUpdateAnyCell = await this.updateCellsCore(dataIndex, dataIndexInc, position, forceReRender, false, false, true, scrollTop, topThreshold, bottomThreshold) || didUpdateAnyCell
    }

    this.updateListBounds()

    positionDeviation
      ? this.setScrollPosition(this.getScrollPosition() + positionDeviation)
      : void 0

    didUpdateAnyCell
      ? this.emitEvent('cellsUpdated', this._cellsSorted, this)
      : void 0

    this._updatingCells = false
    this.scrollToCachedScrollElement()
    this.updateFirstAndLastCellInViewport()
  }

  async updateCellsCore (dataIndex, dataIndexInc, position, forceReRender, needRePositioning, needUpdateAllCells, updatingAllCells, scrollTop, topThreshold, bottomThreshold) {
    const cells = this.getCellsSorted()
    let needUpdateLowestCellHeight = false
    let relocatingCellsComplete = false
    let didUpdateAnyCell = false

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[dataIndexInc > 0 ? i : cells.length - 1 - i]

      if (needUpdateAllCells) {
        cell.__index = dataIndex
        position += this.getNodeHeight(cell) * dataIndexInc
      } else if (await this.updateCell(cell, dataIndex, forceReRender) !== void 0 || updatingAllCells) {
        this.setNodeHeight(cell)

        if (dataIndexInc > 0) {
          this.setNodeTop(cell, position)
          position += dataIndex > -1 ? this.getNodeHeight(cell) : 0
        } else {
          position -= this.getNodeHeight(cell)
          this.setNodeTop(cell, position)
        }

        needUpdateLowestCellHeight = needUpdateLowestCellHeight || (this.getNodeHeight(cell) > 0 && this.getNodeHeight(cell) < this._lowestCellHeight)
        didUpdateAnyCell = true
      }

      dataIndex += dataIndexInc

      if (!relocatingCellsComplete && ((dataIndexInc > 0 && position > scrollTop + bottomThreshold) || (dataIndexInc < 0 && position < scrollTop + topThreshold))) {
        relocatingCellsComplete = true

        dataIndex -= needUpdateAllCells && needRePositioning
          ? cells.length * dataIndexInc
          : 0

        if (!needUpdateAllCells && !updatingAllCells) {
          break
        }
      }

      if (!needUpdateAllCells && (dataIndex > this._currentMaxIndex || dataIndex < 0)) {
        break
      }
    }

    this.updateCellsSorted()

    if (!needUpdateAllCells && ((dataIndex <= 0 && dataIndexInc === -1 && position !== 0) || position < 0)) {
      didUpdateAnyCell = await this.updateCellsCore(0, 1, 0, false, false, false, true, 0, topThreshold, bottomThreshold) || didUpdateAnyCell
      this.setScrollPosition(0)
      return didUpdateAnyCell
    }

    if (needUpdateLowestCellHeight || updatingAllCells) {
      this.updateCellsAverages()
      didUpdateAnyCell = await this.addCellsIfNeeded() || didUpdateAnyCell
      didUpdateAnyCell = await this.removeCellsIfNeeded() || didUpdateAnyCell
    }

    return didUpdateAnyCell
  }

  async updateCell (cell, index, force) {
    const elementAndLevel = this.getElementAndLevelAtIndex(index)

    if (!elementAndLevel) {
      return
    }

    const element = elementAndLevel.element
    const level = elementAndLevel.level

    if (!element || (cell && element === cell.__element && !force)) {
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

  findCellByElement (element) {
    for (let i = 0; i < this._cellsSorted.length; i++) {
      const cell = this._cellsSorted[i]
      if (cell.__element === element) {
        return cell
      }
    }
  }

  cellBoundsUpdated () {
    this.rUpdateCells(true, false, true, true)
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
      await this.updateCells(true, false, true, true)
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
    if (!this.observeCellBounds) {
      return
    }

    for (let i = 0; i < this._cellsSorted.length; i++) {
      this.disableNodeResizeObserving(this._cellsSorted[i])
    }
  }

  enableAllCellsResizeObserving () {
    if (!this.observeCellBounds) {
      return
    }

    for (let i = 0; i < this._cellsSorted.length; i++) {
      this.enableNodeResizeObserving(this._cellsSorted[i])
    }
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
    for (let i = 0; i < this._expandInformations.length; i++) {
      const info = this._expandInformations[i]

      if (info.element === element) {
        return info
      }
    }
  }

  getExpandInformationForElementParent (element) {
    for (let i = 0; i < this._expandInformations.length; i++) {
      const info = this._expandInformations[i]

      if (info.elementChildren.indexOf(element) > -1) {
        return info
      }
    }
  }

  createExpandInformation (element) {
    const parentInfo = this.getExpandInformationForElementParent(element)

    return {
      active: true,
      element: element,
      elementIndex: parentInfo ? parentInfo.elementChildren.indexOf(element) : this._data.indexOf(element),
      elementChildren: this.getElementChildren(element),
      elementParent: parentInfo ? parentInfo.element : void 0,
      index: void 0,
      level: parentInfo ? parentInfo.level + 1 : 1,
      totalLength: 0
    }
  }

  addExpandInformationForElement (element) {
    const info = this.createExpandInformation(element)

    this._expandInformations.push(info)
    this.sortExpandInformations()

    if (this.rememberChildrenExpands) {
      for (let i = this._expandInformations.indexOf(info) + 1; i < this._expandInformations.length; i++) {
        var subsequentInfo = this._expandInformations[i]

        if (subsequentInfo.level <= info.level) {
          break
        }

        subsequentInfo.active = true
      }
    }

    this.calculateExpandInformationIndexes()
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

    this.calculateExpandInformationIndexes()
  }

  invalidateExpandInformations () {
    this.sortExpandInformations()

    const infosToDelete = []

    for (let i = 0; i < this._expandInformations.length; i++) {
      const info = this._expandInformations[i]
      const data = info.elementParent
        ? this._getElementChildren(info.elementParent)
        : this._data
      let parentIsDeleted = false

      for (let i2 = 0; i2 < infosToDelete.length; i2++) {
        parentIsDeleted = infosToDelete[i2].element === info.elementParent || parentIsDeleted
      }

      if (parentIsDeleted || data.indexOf(info.element) === -1) {
        info.elementChildren = []
        infosToDelete.push(info)
      } else {
        info.elementChildren = this._getElementChildren(info.element)
      }
    }

    for (let i = 0; i < infosToDelete.length; i++) {
      this.removeElementFromArray(this._expandInformations, infosToDelete[i])
    }

    this.calculateExpandInformationIndexes()
  }

  sortExpandInformations () {
    const result = []

    for (let i = 0; i < this._expandInformations.length; i++) {
      const info = this._expandInformations[i]

      if (info.elementParent) {
        // Current iteration item has a parent. We need to find this parent in
        // the list and put the item after, but before the next item that has not
        // this parent or a greater dataIndex that the iteration item.

        let matched = false
        let added = false
        let lastCompare = void 0

        for (let i2 = 0; i2 < result.length; i2++) {
          const compare = result[i2]

          if ((matched && compare.elementParent === lastCompare.elementParent && compare.elementIndex > info.elementIndex) || (matched && compare.elementParent === info.elementParent && compare.elementIndex > info.elementIndex) || (matched && compare.level < info.level) || (compare.elementParent === info.element)) {
            result.splice(i2, 0, info)
            added = true
            break
          } else if (compare.element === info.elementParent) {
            matched = true
          }

          lastCompare = compare
        }

        !added
          ? result.push(info)
          : void 0
      } else {
        // Current iteration item has no parent. We need to find the element, that
        // also has no parent but a greater dataIndex than the item and put the
        // item right before it.

        let added = false

        for (let i2 = 0; i2 < result.length; i2++) {
          const compare = result[i2]

          if ((!compare.elementParent && compare.elementIndex > info.elementIndex) || (compare.elementParent === info.element)) {
            result.splice(i2, 0, info)
            added = true
            break
          }
        }

        !added
          ? result.push(info)
          : void 0
      }
    }

    this._expandInformations = result
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
