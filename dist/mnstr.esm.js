class MNSTR{constructor(e){this.context=this,this.parentNode=void 0,this.getData=void 0,this.getElementChildren=void 0,this.getCellRenderer=void 0,this.virtualEnvironment=!1,this.needUpdateVirtualDOM=void 0,this.renderOnInitialize=!0,this.initialScrollToElement=void 0,this.initialScrollToOptions=void 0,this.observeCellBounds=!1,this.rememberChildrenExpands=!0,this.thresholdRatio=.5,this.useTransform=!0,this.className="mnstr",this.didRenderFirstElement=void 0,this.didRenderLastElement=void 0,this.firstInBoundsElementChanged=void 0,this.lastInBoundsElementChanged=void 0,this._data=[],this._scrollNode=void 0,this._listNode=void 0,this._events={},this._lowestCellHeigh=Number.MAX_VALUE,this._averageCellHeight=1,this._currentMaxIndex=0,this._initialScrollToElement=void 0,this._cachedScrollToElement=void 0,this._cachedScrollToOptions=void 0,this._firstInBoundsElement=void 0,this._lastInBoundsElement=void 0,this._frameRequests={},this._cellsSorted=[],this._vElements=[],this._expandInformations=[],this._updatingCells=!1,e=e||{},Object.keys(e).forEach(t=>{"_"===t.charAt(0)&&delete e[t]}),Object.assign(this,e),this._initialScrollToElement=this.initialScrollToElement,this._cachedScrollToElement=this._initialScrollToElement,this._cachedScrollToOptions=this.initialScrollToOptions,this.renderOnInitialize&&this.render()}destroy(){console.error("wheeee.")}async reset(){if(this._data=[],this._lowestCellHeight=Number.MAX_VALUE,this._averageCellHeight=1,this._currentMaxIndex=0,this._cachedScrollToElement=void 0,this._cachedScrollToOptions=void 0,this._frameRequests={},this._cellsSorted=[],this._expandInformations=[],this._vElements=[],this.virtualEnvironment)await this.updateVirtualDOM();else for(;this._listNode.firstChild;)this._listNode.removeChild(this._listNode.firstChild);this.needUpdate(),this.setScrollPosition(0),this.rUpdateCells()}exportRestoreState(){const e=this.getCellsSorted()[0];return{scrollTop:this.getScrollPosition(),index:e.__index,position:this.getNodeTop(e),height:this.getNodeHeight(this._listNode)}}render(e){return this.needUpdate(),this.renderScrollNode(e),this.renderListNode(),this.initScrollListener(),this.rAF(async()=>{await this.updateCells(!0),this.renderListResizeObserver()},"render"),this}renderScrollNode(e){return this._scrollNode&&this._scrollNode.parentNode&&this._scrollNode.parentNode.removeChild(this._scrollNode),this._scrollNode=document.createElement("div"),this._scrollNode.classList.add(this.className),this._scrollNode.setAttribute("style","overflow-y: auto; -webkit-overflow-scrolling: touch; overflow-scrolling: touch; position: relative; will-change: transform;"),this.parentNode=e||this.parentNode||document.body,this.parentNode.appendChild(this._scrollNode),this._scrollNode}renderListNode(){return this._listNode=document.createElement("ul"),this._listNode.classList.add(this.className+"-list"),this._listNode.setAttribute("style","position: relative; overflow: hidden; list-style-type: none; margin: 0; padding: 0;"),this._scrollNode.appendChild(this._listNode),this._listNode}renderIFrame(e,t){const i=document.createElement("iframe");return i.setAttribute("style","position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; border: none; opacity: 0; pointer-events: none; touch-action: none; z-index: -1000;"),i.onload=(e=>{e.target.contentWindow.onresize=t.bind(this)}),e.appendChild(i),i}renderListResizeObserver(){this._scrollNode.__frameNode=this.renderIFrame(this._scrollNode,this.onResizeScrollNode)}renderCell(){const e=document.createElement("li");e.classList.add(this.className+"-cell"),e.setAttribute("style","position: absolute; width: 100%; top: 0; left: 0;"),e.__frameNode=this.observeCellBounds?this.renderIFrame(e,this.onResizeCell):void 0;const t=document.createElement("div");return t.classList.add(this.className+"-content"),t.setAttribute("style","width: 100%; margin: 0; border: 0;"),e.appendChild(t),e.__contentNode=t,this._listNode.appendChild(e),e}updateVirtualDOM(){return new Promise(e=>{this.needUpdateVirtualDOM.call(this.context,[].concat(this._vElements),()=>e())})}addVirtualElement(e,t,i,s){this._vElements&&this._vElements.push(this.createVirtualElement(e,t,i,s))}removeVirtualElementForCell(e){if(!this._vElements)return;const t=this._vElements.findIndex(t=>t.element===e.__element);t>-1&&this._vElements.splice(t,1)}sortVirtualElements(){this._vElements&&this._vElements.sort((e,t)=>e.index<t.index?-1:1)}replaceVirtualElementForCell(e,t,i,s,n){this._vElements&&this._vElements.splice([].slice.call(this.getCells()).indexOf(t),1,this.createVirtualElement(e,i,s,n))}createVirtualElement(e,t,i,s){return{element:e,index:t,isExpanded:i,level:s}}async syncVDOMToInternalState(){const e=this._vElements.slice(0).sort((e,t)=>e.index-t.index)[0].index,t=this.getCellsSorted().find(t=>t.__index===e);if(!t)return;let i=this.getNodeTop(t);await this.updateVirtualDOM(),this.getCells().forEach((e,t)=>{const i=this._vElements[t];e.__index=i.index,e.__element=i.element,e.__level=i.level,e.dataset.level=i.level}),this.updateCellsSorted().reduce((e,t)=>(this.setNodeTop(t,i),this.setNodeHeight(t),e+this.getNodeHeight(t)),i)}getNodeHeight(e,t){return e?t||!e.__nodeHeight?this.setNodeHeight(e,t):e.__nodeHeight||0:0}setNodeHeight(e,t,i,s){return i=Math.max(i,0),s&&(e.style.height=i+"px"),e.__nodeHeight=i||t?e.getBoundingClientRect().height:e.offsetHeight,e.__nodeHeight}getNodeTop(e){return e&&e&&e.__nodeTop||0}setNodeTop(e,t){return t=Math.max(t,0),this.useTransform?e.style.transform="translateY("+t+"px)":e.style.top=t+"px",e.__nodeTop=t,e.__nodeTop}getNodeBottom(e){return e?this.getNodeTop(e)+this.getNodeHeight(e):0}getMinimumListNodeHeight(){const e=this.getNodeHeight(this._scrollNode,!0);return e+e*(2*this.thresholdRatio)}updateListBounds(){if(!this._cellsSorted||!this._cellsSorted.length)return;const e=this.getNodeBottom(this._cellsSorted[this._cellsSorted.length-1]),t=this.getNodeHeight(this._listNode);if(this._cellsSorted[this._cellsSorted.length-1].__index===this._currentMaxIndex)e-t!=0&&this.setNodeHeight(this._listNode,!1,e,!0);else{const i=this._averageCellHeight*(this._currentMaxIndex+1),s=Math.max(e,i);s!==t&&this.setNodeHeight(this._listNode,!1,s,!0)}}getTopRenderThreshold(){return-this.getNodeHeight(this._scrollNode)*this.thresholdRatio}getBottomRenderThreshold(){const e=this.getNodeHeight(this._scrollNode);return e*this.thresholdRatio+e}getCells(){return this._listNode?this._listNode.children:void 0}getCellsSorted(){return this._cellsSorted?this._cellsSorted:this.updateCellsSorted()}updateCellsSorted(){const e=this.getCells();if(e)return this._cellsSorted=[].slice.call(e),this._cellsSorted.sort((e,t)=>e.__index-t.__index),this._cellsSorted}addEventListener(e,t){return this._events[e]=this._events[e]||[],this._events[e].push(t),this}removeEventListener(e,t){if(!this._events[e])return;const i=this._events[e].indexOf(t);i>-1&&this._events[e].splice(i,1)}emitEvent(e){const t=this._events[e],i=[].slice.call(arguments,1);t&&t.length>0&&t.forEach(e=>e.apply(this,i)),this[e]&&this[e].apply(this.context,i)}emitElementEvents(e,t){0===t&&this.emitEvent("didRenderFirstElement",e,this),t===this._currentMaxIndex&&this.emitEvent("didRenderLastElement",e,this)}getScrollPosition(){return this._scrollNode?this._scrollNode.scrollTop:void 0}setScrollPosition(e){this._scrollNode&&(this._scrollNode.scrollTop=e)}initScrollListener(){this._scrollNode&&this._scrollNode.addEventListener("scroll",e=>this.rUpdateCells())}async scrollToFirstElement(){const e=this.getElementAndLevelAtIndex(0);await this.scrollToElement(e.element)}async scrollToLastElement(){const e=this.getElementAndLevelAtIndex(this._currentMaxIndex);await this.scrollToElement(e.element)}async scrollToElement(e,t){const i=Object.assign({smooth:!1,bottom:!1,offset:0},t),s=this._cellsSorted.find(t=>t.__element===e);if(s||await this.updateCells(),s){const e=i.bottom?this.getNodeTop(s)-this.getNodeHeight(this._scrollNode)+this.getNodeHeight(s)+i.offset:this.getNodeTop(s)+i.offset;return this.setScrollPosition(e),delete this._cachedScrollToElement,delete this._cachedScrollToOptions,void delete this._initialScrollToElement}const n=this.getIndexForElement(e);n<0||(this._cachedScrollToElement=e,this._cachedScrollToOptions=i,0!==this._cellsSorted.length&&this.setScrollPosition(n*this._averageCellHeight))}async scrollToCachedScrollElement(){this._cachedScrollToElement&&await this.scrollToElement(this._cachedScrollToElement,this._cachedScrollToOptions)}needUpdate(){return this._data=this.getData?this.getData.call(this.context,this):[],this.updateCurrentMaxIndex(),this.invalidateExpandInformations(),this}update(e,t){return this.needUpdate(),this.rUpdateCells(!0,e,t),this}async restoreState(e){if(this.needUpdate(),-1===this._currentMaxIndex)return;await this.addCell(e.index,e.position)&&(this.setNodeHeight(this._listNode,!1,e.height,!0),this.setScrollPosition(e.scrollTop)),delete this._initialScrollToElement,delete this._cachedScrollToElement,this.updateCellsAverages(),this.updateCells()}getElementAndLevelAtIndex(e){if(!this.canHasChildren())return this.createElementAndLevelInformation(this._data[e],0);let t=0;for(let i=this._expandInformations.length-1;i>=0;i--){const s=this._expandInformations[i];if(s.active&&!(s.index>=e)&&(t+=s.elementChildren.length,!(s.index+t<e))){const i=e-(s.index+t-s.elementChildren.length)-1;return this.createElementAndLevelInformation(s.elementChildren[i],s.level)}}return this.createElementAndLevelInformation(this._data[e-t],0)}createElementAndLevelInformation(e,t){return{element:e,level:t}}updateCurrentMaxIndex(){const e=this._expandInformations.reduce((e,t)=>e+(t.active?t.elementChildren.length:0),0);this._currentMaxIndex=this._data.length-1+e}canHasChildren(){return void 0!==this.getElementChildren}getElementChildren(e){return this.canHasChildren()?this.getElementChildren.call(this.context,e,this):void 0}getIndexForElement(e){let t=this._data.indexOf(e),i=t>-1?this._data:void 0,s=void 0,n=0,l=0;for(let o=0;o<this._expandInformations.length;o++){const d=this._expandInformations[o];if(i===this._data&&!d.elementParent&&d.index>=t)break;if(!i){const o=d.elementChildren.indexOf(e);if(o>-1){t=o,i=d.elementChildren,s=d,n=d.index+1,l=0;continue}}if(s&&d.level>s.level){const e=n+t;if(e<=d.index)return e;l+=d.elementChildren.length}else{if(s)return n+t+l;l+=d.elementChildren.length}}return t>-1?t+l+n:t}async maintainCellCount(){const e=this.getScrollPosition(),t=e+this.getTopRenderThreshold(),i=e+this.getBottomRenderThreshold(),s=this.getCellsSorted(),n=s[0],l=s[s.length-1],o=this.getNodeBottom(l)-this.getNodeTop(n),d=this.getMinimumListNodeHeight(),r=d>o;let h=!1;switch(!0){case!n&&this._currentMaxIndex>-1:const e=this._initialScrollToElement?this.getIndexForElement(this._initialScrollToElement):0,s=await this.addCell(e,0);s&&this.setNodeTop(s,this.getNodeHeight(s)*e),h=!0;break;case l.__index<this._currentMaxIndex&&(r||this.getNodeBottom(l)<i):await this.addCell(l.__index+1,this.getNodeBottom(l)),h=!0;break;case n.__index>0&&(r||this.getNodeTop(n)>t):await this.addCell(n.__index-1,this.getNodeTop(n),!0),h=!0;break;case n.__index<0||this.getNodeBottom(n)<t&&o-this.getNodeHeight(n)>d:await this.removeCell(n),h=!0;break;case l.__index>this._currentMaxIndex||this.getNodeTop(l)>i&&o-this.getNodeHeight(l)>d:await this.removeCell(l),h=!0}h&&(this.updateCellsSorted(),this.updateCellsAverages(),this.updateListBounds(),this._initialScrollToElement&&await this.scrollToCachedScrollElement(),await this.updateCells(),await this.maintainCellCount())}async addCell(e,t,i=!1){if(e<0||e>this._currentMaxIndex)return;const s=this.virtualEnvironment?await this.updateCell(void 0,e):await this.updateCell(this.renderCell(),e);return s?(s.__frameNode=this.virtualEnvironment&&this.observeCellBounds?this.renderIFrame(s,this.onResizeCell):s.__frameNode,this.setNodeHeight(s),this.setNodeTop(s,t-(i?this.getNodeHeight(s):0)),s):void 0}async removeCell(e){this.virtualEnvironment?(this.removeVirtualElementForCell(e),await this.syncVDOMToInternalState()):this._listNode.removeChild(e)}rUpdateCells(e,t,i){this.rAF(this.updateCells,"updatecells",e,t,i)}async updateCells(e,t,i){if(this._updatingCells)return;this._updatingCells=!0;const s=this.getScrollPosition(),n=s+this.getTopRenderThreshold(),l=s+this.getBottomRenderThreshold(),o=this.getCellsSorted().slice(0);let d={},r=!1;if(e)if(d.index=0,d.pos=0,i){const e=this.findCellIndexDeviation(),t=e*this._averageCellHeight;d.index=o[0].__index+e,d.pos=this.getNodeTop(o[0])+t,this.updateListBounds(),this.setScrollPosition(s+t)}else this.setScrollPosition(0);o&&o.length&&(this.getNodeTop(o[0])>l||this.getNodeBottom(o[o.length-1])<n)&&(e=!0,d.index=Math.min(Math.round(Math.max(n,0)/this._averageCellHeight),this._currentMaxIndex-o.length+1),d.pos=d.index*this._averageCellHeight+this.getTopRenderThreshold());for(let i=0;i<o.length;i++){const h=o[0],a=o[o.length-1],c=o[i];if(e){const e=0===c.__index&&d.index>0?this.getNodeHeight(c):0;await this.updateCell(c,d.index,t),this.setNodeHeight(c),d.pos+=e?e-this.getNodeHeight(c):0,this.setNodeTop(c,d.pos),d.index+=1,d.pos+=this.getNodeHeight(c),r=!0}else if(a.__index<this._currentMaxIndex&&this.getNodeBottom(c)<n&&this.getNodeBottom(a)<l)await this.updateCell(c,a.__index+1,t),this.setNodeHeight(c),this.setNodeTop(c,this.getNodeBottom(a)),o.push(o.shift()),r=!0;else if(i===o.length-1&&h.__index>0&&this.getNodeTop(c)>l&&this.getNodeTop(h)>n)switch(await this.updateCell(c,h.__index-1,t),this.setNodeHeight(c),this.setNodeTop(c,this.getNodeTop(h)-this.getNodeHeight(c)),o.unshift(o.pop()),r=!0,!0){case 0===c.__index&&this.getNodeTop(c)>0:const n=this.getNodeTop(c);e=!0,d.index=c.__index,d.pos=0,this.setScrollPosition(s-n),i=-1;break;case 0===this.getNodeTop(c):const l=this._averageCellHeight*c.__index;e=!0,d.index=c.__index,d.pos=l,this.setScrollPosition(s+l),i=-1;break;default:i--}}o&&o.length&&!r||(this.updateCellsSorted(),await this.maintainCellCount(),this.updateCellsAverages(),this.updateListBounds(),this.emitEvent("cellsUpdated",this.getCellsSorted(),this)),this.scrollToCachedScrollElement(),this.updateFirstAndLastCellInViewport(),this._updatingCells=!1}async updateCell(e,t,i){const s=this.getElementAndLevelAtIndex(t);if(!s)return;const n=s.element,l=s.level;if(!n||e&&n===e.__element&&!i)return void(e&&n===e.__element&&(e.__index=t,e.__level=l,e.dataset.level=l));const o=this.canHasChildren()?this.getExpandInformationForElement(n):void 0;if(e&&this.disableNodeResizeObserving(e),this.virtualEnvironment){if(e?this.replaceVirtualElementForCell(n,e,t,void 0!==o,l):this.addVirtualElement(n,t,void 0!==o,l),await this.updateVirtualDOM(),!e){const t=this.getCells();e=t[t.length-1]}}else{const i=this.getCellRenderer?this.getCellRenderer.call(this.context,n,t,void 0!==o,this):"";"string"==typeof i||i instanceof String?e.__contentNode.innerHTML=i:(e.__contentNode.innerHTML="",e.__contentNode.appendChild(i))}return this.observeCellBounds&&this.rAF(this.enableNodeResizeObserving,!1,e),o?e.classList.add("expanded"):e.classList.remove("expanded"),e.dataset.level=l,e.__element=n,e.__index=t,e.__level=l,this.emitElementEvents(n,t),e}findCellIndexDeviation(){for(let e=0;e<this._cellsSorted.length;e++){const t=this._cellsSorted[e],i=this.getIndexForElement(t.__element);if(-1!==i)return i===t.__index?0:i-t.__index}return 0}updateCellsAverages(){const e=this.getCells();let t=0;this._lowestCellHeight=Number.MAX_VALUE;for(let i=0;i<e.length;i++){const s=this.getNodeHeight(e[i]);t+=s,this._lowestCellHeight=0===this._lowestCellHeight?s:Math.min(this._lowestCellHeight,s)}this._averageCellHeight=t/e.length}cellBoundsUpdated(){this.rUpdateCells(!0,!1,!0)}updateFirstAndLastCellInViewport(){const e=this.getScrollPosition(),t=this.getNodeHeight(this._scrollNode),i=this.getCellsSorted(),s=e+t,n=Math.max(1,Math.round(i.length/5));let l=-1,o=-1;for(let t=0;t<i.length;t+=n){const s=i[t];if(this.getNodeTop(s)>e){l=Math.max(0,t-n);break}}if(l>-1){for(;;){const t=i[l];if(this.getNodeTop(t)>=e)break;l++}for(o=l;;){const e=i[o];if(!e||this.getNodeTop(e)+this.getNodeHeight(e)>=s){o--;break}o++}if(l<0||o<0)return;const t=i[l].__element,n=i[o].__element;t!==this._firstInBoundsElement&&(this._firstInBoundsElement=t,this.emitEvent("firstInBoundsElementChanged",this._firstInBoundsElement,this)),n!==this._lastInBoundsElement&&(this._lastInBoundsElement=n,this.emitEvent("lastInBoundsElementChanged",this._lastInBoundsElement,this))}}onResizeScrollNode(e){this.disableAllCellsResizeObserving(),this.rAF(async()=>{await this.updateCells(!0,!1,!0),this.setNodeHeight(this._scrollNode),this.enableAllCellsResizeObserving()},"resizelist")}onResizeCell(e){this.cellBoundsUpdated()}disableNodeResizeObserving(e){e.__frameNode&&e.__frameNode.contentWindow&&e.__frameNode.contentWindow.onresize&&(e.__frameNode.contentWindow.__onresize=e.__frameNode.contentWindow.onresize,e.__frameNode.contentWindow.onresize=void 0)}enableNodeResizeObserving(e){this.observeCellBounds&&e.__frameNode&&e.__frameNode.contentWindow&&e.__frameNode.contentWindow.__onresize&&(e.__frameNode.contentWindow.onresize=e.__frameNode.contentWindow.__onresize,e.__frameNode.contentWindow.__onresize=void 0)}disableAllCellsResizeObserving(){this.observeCellBounds&&this.getCellsSorted().forEach(e=>this.disableNodeResizeObserving(e))}enableAllCellsResizeObserving(){this.observeCellBounds&&this.getCellsSorted().forEach(e=>this.enableNodeResizeObserving(e))}isElementExpanded(e){return void 0!==this.getExpandInformationForElement(e)}expandElement(e){this.addExpandInformationForElement(e),this.updateCells(!0,!1,!0)}collapseElement(e){this.removeExpandInformationForElement(e),this.updateCells(!0,!1,!0)}toggleExpandElement(e){this.isElementExpanded(e)?this.collapseElement(e):this.expandElement(e)}getExpandInformationForElement(e){return this._expandInformations.find(t=>t.element===e)}getExpandInformationForElementParent(e){return this._expandInformations.find(t=>t.elementChildren.indexOf(e)>-1)}createExpandInformation(e){const t=this.getExpandInformationForElementParent(e);return{active:!0,element:e,elementIndex:t?t.elementChildren.indexOf(e):this._data.indexOf(e),elementChildren:this.getElementChildren(e),elementParent:t?t.element:void 0,index:void 0,level:t?t.level+1:1,totalLength:0}}addExpandInformationForElement(e){const t=this.createExpandInformation(e);if(this._expandInformations.push(t),this.sortExpandInformations(),this.rememberChildrenExpands)for(let e=this._expandInformations.indexOf(t)+1;e<this._expandInformations.length;e++){var i=this._expandInformations[e];if(i.level<=t.level)break;i.active=!0}this.calculateExpandInformationIndexes()}removeExpandInformationForElement(e){const t=this.getExpandInformationForElement(e),i=[t];for(let e=this._expandInformations.indexOf(t)+1;e<this._expandInformations.length;e++){const s=this._expandInformations[e];if(s.level<=t.level)break;i.push(s)}for(let e=0;e<i.length;e++){const s=i[e];s===t?this.removeElementFromArray(this._expandInformations,s):this.rememberChildrenExpands?s.active=!1:this.removeElementFromArray(this._expandInformations,s)}this.calculateExpandInformationIndexes()}invalidateExpandInformations(){this.sortExpandInformations();const e=[];for(let t=0;t<this._expandInformations.length;t++){const i=this._expandInformations[t],s=i.elementParent?this._getElementChildren(i.elementParent):this._data;let n=!1;for(let t=0;t<e.length;t++)n=e[t].element===i.elementParent||n;n||-1===s.indexOf(i.element)?(i.elementChildren=[],e.push(i)):i.elementChildren=this._getElementChildren(i.element)}for(let t=0;t<e.length;t++)this.removeElementFromArray(this._expandInformations,e[t]);this.calculateExpandInformationIndexes()}sortExpandInformations(){const e=[];for(let t=0;t<this._expandInformations.length;t++){const i=this._expandInformations[t];if(i.elementParent){let t=!1,s=!1,n=void 0;for(let l=0;l<e.length;l++){const o=e[l];if(t&&o.elementParent===n.elementParent&&o.elementIndex>i.elementIndex||t&&o.elementParent===i.elementParent&&o.elementIndex>i.elementIndex||t&&o.level<i.level||o.elementParent===i.element){e.splice(l,0,i),s=!0;break}o.element===i.elementParent&&(t=!0),n=o}s||e.push(i)}else{let t=!1;for(let s=0;s<e.length;s++){const n=e[s];if(!n.elementParent&&n.elementIndex>i.elementIndex||n.elementParent===i.element){e.splice(s,0,i),t=!0;break}}t||e.push(i)}}this._expandInformations=e}calculateExpandInformationIndexes(){let e=[],t=void 0,i=0;for(let s=0;s<this._expandInformations.length;s++){const n=this._expandInformations[s];if(!n.active)continue;t&&(n.level>t.level&&e.push(t),n.level<t.level&&(e=e.slice(0,e.length-(t.level-n.level)))),n.totalLength=n.elementChildren.length;for(let t=0;t<e.length;t++)e[t].totalLength+=n.totalLength;const l=e.length>0?e[e.length-1]:void 0,o=l?l.index:void 0,d=l?l.totalLength-n.totalLength:0,r=l?l.elementChildren.length:0,h=e&&e.length>0?e[e.length-1].elementChildren.indexOf(n.element):this._data.indexOf(n.element),a=d-r+h+(void 0!==o?o+1:0)+(1===n.level?i:0);n.elementIndex=h,n.index=a,t=n,i+=n.elementChildren.length}this.updateCurrentMaxIndex()}rAF(e,t){const i=[].slice.call(arguments,2);this.virtualEnvironment?e.apply(this,i):t?(this._frameRequests[t]&&window.cancelAnimationFrame(this._frameRequests[t]),this._frameRequests[t]=window.requestAnimationFrame(()=>{e.apply(this,i),delete this._frameRequests[t]})):window.requestAnimationFrame(()=>e.apply(this,i))}removeElementFromArray(e,t){const i=e?e.indexOf(t):-1;return i>-1?e.splice(i,1):void 0}}export default MNSTR;
