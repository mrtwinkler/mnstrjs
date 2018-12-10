class MNSTR{constructor(e){this.context=this,this.parentNode=void 0,this.getData=void 0,this.getElementChildren=void 0,this.getCellRenderer=void 0,this.virtualEnvironment=!1,this.needUpdateVirtualDOM=void 0,this.renderOnInitialize=!0,this.initialScrollToElement=void 0,this.observeCellBounds=!1,this.rememberChildrenExpands=!0,this.thresholdRatio=.5,this.preventWheelBubbling=!1,this.useTransform=!0,this.className="mnstr",this.didRenderFirstElement=void 0,this.didRenderLastElement=void 0,this.firstInBoundsElementChanged=void 0,this.lastInBoundsElementChanged=void 0,this._data=[],this._scrollNode=void 0,this._listNode=void 0,this._events={},this._lastScrollPosition=0,this._lowestCellHeigh=Number.MAX_VALUE,this._averageCellHeight=1,this._currentMaxIndex=0,this._initialScrollToElement=void 0,this._cachedScrollToElement=void 0,this._firstInBoundsElement=void 0,this._lastInBoundsElement=void 0,this._frameRequests={},this._cellsSorted=[],this._vElements=[],this._expandInformations=[],this._didScrollToBounds=!1,this._updatingCells=!1,e=e||{},Object.keys(e).forEach(t=>{"_"===t.charAt(0)&&delete e[t]}),Object.assign(this,e),this._initialScrollToElement=this.initialScrollToElement,this._cachedScrollToElement=this._initialScrollToElement,this.renderOnInitialize&&this.render()}destroy(){console.error("wheeee.")}async reset(){if(this._data=[],this._lastScrollPosition=0,this._lowestCellHeight=Number.MAX_VALUE,this._averageCellHeight=1,this._currentMaxIndex=0,this._cachedScrollToElement=void 0,this._frameRequests={},this._cellsSorted=[],this._expandInformations=[],this._vElements=[],this.virtualEnvironment)await this.updateVirtualDOM();else for(;this._listNode.firstChild;)this._listNode.removeChild(this._listNode.firstChild);this.needUpdate(),this.setScrollPosition(0),this.rUpdateCells()}render(e){return this.needUpdate(),this.renderScrollNode(e),this.renderListNode(),this.initScrollListener(),this.rAF(async()=>{await this.updateCells(!0),this.renderListResizeObserver()},"render"),this}renderScrollNode(e){return this._scrollNode&&this._scrollNode.parentNode&&this._scrollNode.parentNode.removeChild(this._scrollNode),this._scrollNode=document.createElement("div"),this._scrollNode.classList.add(this.className),this._scrollNode.setAttribute("style","overflow-y: auto; -webkit-overflow-scrolling: touch; overflow-scrolling: touch; position: relative;"),this.parentNode=e||this.parentNode||document.body,this.parentNode.appendChild(this._scrollNode),this._scrollNode}renderListNode(){return this._listNode=document.createElement("ul"),this._listNode.classList.add(this.className+"-list"),this._listNode.setAttribute("style","position: relative; overflow: hidden; list-style-type: none; margin: 0; padding: 0;"),this._scrollNode.appendChild(this._listNode),this._listNode}renderIFrame(e,t){const i=document.createElement("iframe");return i.setAttribute("style","position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; border: none; opacity: 0; pointer-events: none; touch-action: none; z-index: -1000;"),i.onload=(e=>{e.target.contentWindow.onresize=t.bind(this)}),e.appendChild(i),i}renderListResizeObserver(){this._scrollNode.__frameNode=this.renderIFrame(this._scrollNode,this.onResizeScrollNode)}renderCell(){const e=document.createElement("li");e.classList.add(this.className+"-cell"),e.setAttribute("style","position: absolute; width: 100%; top: 0; left: 0;"),e.__frameNode=this.observeCellBounds?this.renderIFrame(e,this.onResizeCell):void 0;const t=document.createElement("div");return t.classList.add(this.className+"-content"),t.setAttribute("style","width: 100%; margin: 0; border: 0;"),e.appendChild(t),e.__contentNode=t,this._listNode.appendChild(e),e}updateVirtualDOM(){return new Promise(e=>{this.needUpdateVirtualDOM.call(this.context,this._vElements,()=>e())})}addVirtualElement(e,t,i,s){this._vElements&&this._vElements.push(this.createVirtualElement(e,t,i,s))}removeVirtualElementForCell(e){this._vElements&&this._vElements.splice(this._cellsSorted.indexOf(e),1)}sortVirtualElements(){this._vElements&&this._vElements.sort((e,t)=>e.index<t.index?-1:1)}replaceVirtualElementForCell(e,t,i,s,l){this._vElements&&this._vElements.splice([].slice.call(this.getCells()).indexOf(t),1,this.createVirtualElement(e,i,s,l))}createVirtualElement(e,t,i,s){return{element:e,index:t,isExpanded:i,level:s}}syncCellSortingWithDOM(e,t){const i=this.getCells();for(let s=0;s<i.length;s++){const l=i[s];void 0!==e&&this.setNodeTop(l,e),l.__index=t,e=e||0,e+=this.getNodeHeight(l),t++}}getNodeHeight(e,t){return t||!e.__nodeHeight?this.setNodeHeight(e,t):e.__nodeHeight||0}setNodeHeight(e,t,i,s){return i=Math.max(i,0),s&&(e.style.height=i+"px"),e.__nodeHeight=i||t?e.getBoundingClientRect().height:e.offsetHeight,e.__nodeHeight}getNodeTop(e){return e.__nodeTop||0}setNodeTop(e,t){return t=Math.max(t,0),this.useTransform?e.style.transform="translateY("+t+"px)":e.style.top=t+"px",e.__nodeTop=t,e.__nodeTop}getNodeBottom(e){return this.getNodeTop(e)+this.getNodeHeight(e)}getFirstCellTop(){return this._cellsSorted&&this._cellsSorted.length>0?this.getNodeTop(this._cellsSorted[0]):0}getLastCellBottom(){return this._cellsSorted&&this._cellsSorted.length>0?this.getNodeBottom(this._cellsSorted[this._cellsSorted.length-1]):0}getMinimumListNodeHeight(){const e=this.getNodeHeight(this._scrollNode,!0);return e+e*(2*this.thresholdRatio)}updateListBounds(){const e=this.getLastCellBottom(),t=this.getNodeHeight(this._listNode);if(this.getLastRenderIndex()===this._currentMaxIndex)e-t!=0&&this.setNodeHeight(this._listNode,!1,e,!0);else{const i=this._averageCellHeight*(this._currentMaxIndex+1),s=Math.max(e,i);s!==t&&this.setNodeHeight(this._listNode,!1,s,!0)}}getTopRenderThreshold(){return-this.getNodeHeight(this._scrollNode,!0)*this.thresholdRatio}getBottomRenderThreshold(){const e=this.getNodeHeight(this._scrollNode,!0);return e*this.thresholdRatio+e}getCells(){return this._listNode.children}getCellsSorted(){return this._cellsSorted?this._cellsSorted:this.updateCellsSorted()}updateCellsSorted(){const e=this.getCells();return this._cellsSorted=[].slice.call(e),this._cellsSorted.sort((e,t)=>e.__index-t.__index),this._cellsSorted}getFirstRenderIndex(){return this._cellsSorted&&this._cellsSorted.length>0?this._cellsSorted[0].__index:-1}getLastRenderIndex(){return this._cellsSorted&&this._cellsSorted.length>0?this._cellsSorted[this._cellsSorted.length-1].__index:-1}addEventListener(e,t){return this._events[e]=this._events[e]||[],this._events[e].push(t),this}removeEventListener(e,t){if(!this._events[e])return;const i=this._events[e].indexOf(t);i>-1&&this._events[e].splice(i,1)}emitEvent(e){const t=this._events[e],i=[].slice.call(arguments,1);t&&t.length>0&&t.forEach(e=>e.apply(this,i)),this[e]&&this[e].apply(this.context,i)}emitElementEvents(e,t){0===t&&this.emitEvent("didRenderFirstElement",e,this),t===this._currentMaxIndex&&this.emitEvent("didRenderLastElement",e,this)}getScrollPosition(){return this._scrollNode.scrollTop}setScrollPosition(e){this._scrollNode.scrollTop=e}initScrollListener(){this._scrollNode.addEventListener("scroll",e=>this.rAF(this.onScroll,"onscroll",e)),this.preventWheelBubbling&&this._scrollNode.addEventListener("wheel",this.onWheel)}onWheel(e){const t=e.deltaY,i=t<0&&0===this._scrollNode.scrollTop,s=t>0&&this._scrollNode.scrollTop>=this.getNodeHeight(this._listNode)-this.getNodeHeight(this._scrollNode);this._didScrollToBounds=i||s,this._didScrollToBounds&&e.preventDefault(),i&&(this.setScrollPosition(1),this.setScrollPosition(0))}onScroll(e){this._lastScrollPosition=this._scrollNode.scrollTop,this._didScrollToBounds=this._scrollNode.scrollTop<=this._lastScrollPosition||this._scrollNode.scrollTop>=this._lastScrollPosition,this.rUpdateCells()}scrollToFirstElement(){const e=this.getElementAndLevelAtIndex(0);this.scrollToElement(e.element)}scrollToLastElement(){const e=this.getElementAndLevelAtIndex(this._currentMaxIndex);this.scrollToElement(e.element)}scrollToElement(e){this.rAF(async()=>{const t=this.findCellByElement(e);if(t||await this.updateCells(),t)return this.setScrollPosition(this.getNodeTop(t)),delete this._cachedScrollToElement,void delete this._initialScrollToElement;const i=this.getIndexForElement(e);i<0||(this._cachedScrollToElement=e,0!==this._cellsSorted.length&&this.setScrollPosition(i*this._averageCellHeight))})}scrollToCachedScrollElement(){this._cachedScrollToElement&&this.scrollToElement(this._cachedScrollToElement)}needUpdate(){return this._data=this.getData?this.getData.call(this.context,this):[],this.updateCurrentMaxIndex(),this.invalidateExpandInformations(),this}update(e,t){return this.needUpdate(),this.rUpdateCells(!0,e,t),this}getElementAndLevelAtIndex(e){if(!this.canHasChildren())return this.createElementAndLevelInformation(this._data[e],0);let t=0;for(let i=this._expandInformations.length-1;i>=0;i--){const s=this._expandInformations[i];if(s.active&&!(s.index>=e)&&(t+=s.elementChildren.length,!(s.index+t<e))){const i=e-(s.index+t-s.elementChildren.length)-1;return this.createElementAndLevelInformation(s.elementChildren[i],s.level)}}return this.createElementAndLevelInformation(this._data[e-t],0)}createElementAndLevelInformation(e,t){return{element:e,level:t}}updateCurrentMaxIndex(){let e=0;for(let t=0;t<this._expandInformations.length;t++){const i=this._expandInformations[t];e+=i.active?i.elementChildren.length:0}this._currentMaxIndex=this._data.length-1+e}canHasChildren(){return void 0!==this.getElementChildren}getElementChildren(e){return this.canHasChildren()?this.getElementChildren.call(this.context,e,this):void 0}getIndexForElement(e){let t=this._data.indexOf(e),i=t>-1?this._data:void 0,s=void 0,l=0,n=0;for(let o=0;o<this._expandInformations.length;o++){const r=this._expandInformations[o];if(i===this._data&&!r.elementParent&&r.index>=t)break;if(!i){const o=r.elementChildren.indexOf(e);if(o>-1){t=o,i=r.elementChildren,s=r,l=r.index+1,n=0;continue}}if(s&&r.level>s.level){const e=l+t;if(e<=r.index)return e;n+=r.elementChildren.length}else{if(s)return l+t+n;n+=r.elementChildren.length}}return t>-1?t+n+l:t}async addCellsIfNeeded(){let e=!1;for(;0===this.getCellsSorted().length||this._lowestCellHeight*(this.getCells().length-2)<this.getMinimumListNodeHeight();){let t=this.getFirstRenderIndex(),i=this.getLastRenderIndex();const s=i<this._currentMaxIndex;if(i>=this._currentMaxIndex&&t<=0)break;let l=s?++i:--t;if((l=this._initialScrollToElement&&0===this.getCellsSorted().length?this.getIndexForElement(this._initialScrollToElement):l)<0||l>this._currentMaxIndex)break;let n=this.virtualEnvironment?void 0:this.renderCell();(n=await this.updateCell(n,l)).__frameNode=this.virtualEnvironment&&this.observeCellBounds?this.renderIFrame(n,this.onResizeCell):n.__frameNode,this.setNodeHeight(n);let o=s?this.getLastCellBottom():this.getFirstCellTop()-this.getNodeHeight(n);this.setNodeTop(n,o),this.updateCellsAverages(),this.updateCellsSorted(),this.updateListBounds(),e=!0}if(this._initialScrollToElement){let e=this.getFirstRenderIndex()*this._averageCellHeight;const t=this.getCellsSorted();for(let i=0;i<t.length;i++){const s=t[i];this.setNodeTop(s,e),e+=this.getNodeHeight(s)}this.updateListBounds()}return e}async removeCellsIfNeeded(){const e=this.getCellsSorted(),t=this.getMinimumListNodeHeight();let i=!1;for(let s=e.length-1;s>=0;s--){const l=e[s];(l.__index<0||l.__index>this._currentMaxIndex||s===e.length-1&&this._lowestCellHeight*(e.length-2)-this.getNodeHeight(l)>t)&&(this.virtualEnvironment?this.removeVirtualElementForCell(l):this._listNode.removeChild(l),e.splice(s,1),i=!0)}if(this.virtualEnvironment&&this._vElements&&this._vElements.length!==this.getCells().length)if(e.length>0){const t=this.getNodeTop(e[0]),i=e[0].__index;this.sortVirtualElements(),await this.updateVirtualDOM(),this.syncCellSortingWithDOM(t,i)}else await this.updateVirtualDOM();return this.updateCellsSorted(),this.updateCellsAverages(),this.updateListBounds(),i}rUpdateCells(e,t,i,s){this.rAF(this.updateCells,"updatecells",e,t,i,s)}async updateCells(e,t,i,s){if(this._updatingCells)return;const l=this.getScrollPosition(),n=this.getTopRenderThreshold(),o=this.getBottomRenderThreshold(),r=this.getFirstCellTop(),h=this.getLastCellBottom(),d=this.getFirstRenderIndex(),a=this.getLastRenderIndex(),c=r>l+n,m=r>l+o,_=h<l+n,g=h<l+o;let u=0,p=1,f=0,v=!1,x=!1,C=!1;if(!(c||g||e))return void this.updateFirstAndLastCellInViewport();if(m||_){const e=Math.round(Math.max(l+n,0)/this._averageCellHeight);f=(u=Math.min(e,this._currentMaxIndex-this.getCellsSorted().length+p))*this._averageCellHeight,x=!0}else if(g&&a<this._currentMaxIndex&&!s)u=a+p,f=h,v=!0;else if(c&&(d>0||e)&&!s)u=d+(p=-1),f=r,v=!0;else{if(!e)return void this.updateFirstAndLastCellInViewport();u=d,f=r,x=!0}this._updatingCells=!0;let E=0;if(e)if(i){const e=this.findCellIndexDeviation();E=Math.round(e*this._averageCellHeight),u+=e,g&&a+e>=this._currentMaxIndex&&(u=d+e,f=r)}else u=0,f=0,v=!1,x=!0,e=!1,this.setScrollPosition(0);C=await this.updateCellsCore(u,p,f,t,v,e,x,l,n,o),e&&i&&(u=p>0?this.getFirstRenderIndex():this.getLastRenderIndex(),f=p>0?this.getFirstCellTop()+E:this.getLastCellBottom()+E,C=await this.updateCellsCore(u,p,f,t,!1,!1,!0,l,n,o)||C),this.updateListBounds(),E&&this.setScrollPosition(this.getScrollPosition()+E),C&&this.emitEvent("cellsUpdated",this._cellsSorted,this),this._updatingCells=!1,this.scrollToCachedScrollElement(),this.updateFirstAndLastCellInViewport()}async updateCellsCore(e,t,i,s,l,n,o,r,h,d){const a=this.getCellsSorted();let c=!1,m=!1,_=!1;for(let g=0;g<a.length;g++){const u=a[t>0?g:a.length-1-g];if(n?(u.__index=e,i+=this.getNodeHeight(u)*t):(void 0!==await this.updateCell(u,e,s)||o)&&(this.setNodeHeight(u),t>0?(this.setNodeTop(u,i),i+=e>-1?this.getNodeHeight(u):0):(i-=this.getNodeHeight(u),this.setNodeTop(u,i)),c=c||this.getNodeHeight(u)>0&&this.getNodeHeight(u)<this._lowestCellHeight,_=!0),e+=t,!m&&(t>0&&i>r+d||t<0&&i<r+h)&&(m=!0,e-=n&&l?a.length*t:0,!n&&!o))break;if(!n&&(e>this._currentMaxIndex||e<0))break}return this.updateCellsSorted(),!n&&(e<=0&&-1===t&&0!==i||i<0)?(_=await this.updateCellsCore(0,1,0,!1,!1,!1,!0,0,h,d)||_,this.setScrollPosition(0),_):((c||o)&&(this.updateCellsAverages(),_=await this.addCellsIfNeeded()||_,_=await this.removeCellsIfNeeded()||_),_)}async updateCell(e,t,i){const s=this.getElementAndLevelAtIndex(t);if(!s)return;const l=s.element,n=s.level;if(!l||e&&l===e.__element&&!i)return;const o=this.canHasChildren()?this.getExpandInformationForElement(l):void 0;if(e&&this.disableNodeResizeObserving(e),this.virtualEnvironment){if(e?this.replaceVirtualElementForCell(l,e,t,void 0!==o,n):this.addVirtualElement(l,t,void 0!==o,n),await this.updateVirtualDOM(),!e){const t=this.getCells();e=t[t.length-1]}}else{const i=this.getCellRenderer?this.getCellRenderer.call(this.context,l,t,void 0!==o,this):"";"string"==typeof i||i instanceof String?e.__contentNode.innerHTML=i:(e.__contentNode.innerHTML="",e.__contentNode.appendChild(i))}return this.observeCellBounds&&this.rAF(this.enableNodeResizeObserving,!1,e),o?e.classList.add("expanded"):e.classList.remove("expanded"),e.dataset.level=n,e.__element=l,e.__index=t,e.__level=n,this.emitElementEvents(l,t),e}findCellIndexDeviation(){for(let e=0;e<this._cellsSorted.length;e++){const t=this._cellsSorted[e],i=this.getIndexForElement(t.__element);if(-1!==i)return i===t.__index?0:i-t.__index}return 0}updateCellsAverages(){const e=this.getCells();let t=0;this._lowestCellHeight=Number.MAX_VALUE;for(let i=0;i<e.length;i++){const s=this.getNodeHeight(e[i]);t+=s,this._lowestCellHeight=0===this._lowestCellHeight?s:Math.min(this._lowestCellHeight,s)}this._averageCellHeight=t/e.length}findCellByElement(e){for(let t=0;t<this._cellsSorted.length;t++){const i=this._cellsSorted[t];if(i.__element===e)return i}}cellBoundsUpdated(){this.rUpdateCells(!0,!1,!0,!0)}updateFirstAndLastCellInViewport(){const e=this.getScrollPosition(),t=this.getNodeHeight(this._scrollNode),i=this.getCellsSorted(),s=e+t,l=Math.max(1,Math.round(i.length/5));let n=-1,o=-1;for(let t=0;t<i.length;t+=l){const s=i[t];if(this.getNodeTop(s)>e){n=Math.max(0,t-l);break}}if(n>-1){for(;;){const t=i[n];if(this.getNodeTop(t)>=e)break;n++}for(o=n;;){const e=i[o];if(!e||this.getNodeTop(e)+this.getNodeHeight(e)>=s){o--;break}o++}if(n<0||o<0)return;const t=i[n].__element,l=i[o].__element;t!==this._firstInBoundsElement&&(this._firstInBoundsElement=t,this.emitEvent("firstInBoundsElementChanged",this._firstInBoundsElement,this)),l!==this._lastInBoundsElement&&(this._lastInBoundsElement=l,this.emitEvent("lastInBoundsElementChanged",this._lastInBoundsElement,this))}}onResizeScrollNode(e){this.disableAllCellsResizeObserving(),this.rAF(async()=>{await this.updateCells(!0,!1,!0,!0),this.setNodeHeight(this._scrollNode),this.enableAllCellsResizeObserving()},"resizelist")}onResizeCell(e){this.cellBoundsUpdated()}disableNodeResizeObserving(e){e.__frameNode&&e.__frameNode.contentWindow&&e.__frameNode.contentWindow.onresize&&(e.__frameNode.contentWindow.__onresize=e.__frameNode.contentWindow.onresize,e.__frameNode.contentWindow.onresize=void 0)}enableNodeResizeObserving(e){this.observeCellBounds&&e.__frameNode&&e.__frameNode.contentWindow&&e.__frameNode.contentWindow.__onresize&&(e.__frameNode.contentWindow.onresize=e.__frameNode.contentWindow.__onresize,e.__frameNode.contentWindow.__onresize=void 0)}disableAllCellsResizeObserving(){if(this.observeCellBounds)for(let e=0;e<this._cellsSorted.length;e++)this.disableNodeResizeObserving(this._cellsSorted[e])}enableAllCellsResizeObserving(){if(this.observeCellBounds)for(let e=0;e<this._cellsSorted.length;e++)this.enableNodeResizeObserving(this._cellsSorted[e])}isElementExpanded(e){return void 0!==this.getExpandInformationForElement(e)}expandElement(e){this.addExpandInformationForElement(e),this.updateCells(!0,!1,!0)}collapseElement(e){this.removeExpandInformationForElement(e),this.updateCells(!0,!1,!0)}toggleExpandElement(e){this.isElementExpanded(e)?this.collapseElement(e):this.expandElement(e)}getExpandInformationForElement(e){for(let t=0;t<this._expandInformations.length;t++){const i=this._expandInformations[t];if(i.element===e)return i}}getExpandInformationForElementParent(e){for(let t=0;t<this._expandInformations.length;t++){const i=this._expandInformations[t];if(i.elementChildren.indexOf(e)>-1)return i}}createExpandInformation(e){const t=this.getExpandInformationForElementParent(e);return{active:!0,element:e,elementIndex:t?t.elementChildren.indexOf(e):this._data.indexOf(e),elementChildren:this.getElementChildren(e),elementParent:t?t.element:void 0,index:void 0,level:t?t.level+1:1,totalLength:0}}addExpandInformationForElement(e){const t=this.createExpandInformation(e);if(this._expandInformations.push(t),this.sortExpandInformations(),this.rememberChildrenExpands)for(let e=this._expandInformations.indexOf(t)+1;e<this._expandInformations.length;e++){var i=this._expandInformations[e];if(i.level<=t.level)break;i.active=!0}this.calculateExpandInformationIndexes()}removeExpandInformationForElement(e){const t=this.getExpandInformationForElement(e),i=[t];for(let e=this._expandInformations.indexOf(t)+1;e<this._expandInformations.length;e++){const s=this._expandInformations[e];if(s.level<=t.level)break;i.push(s)}for(let e=0;e<i.length;e++){const s=i[e];s===t?this.removeElementFromArray(this._expandInformations,s):this.rememberChildrenExpands?s.active=!1:this.removeElementFromArray(this._expandInformations,s)}this.calculateExpandInformationIndexes()}invalidateExpandInformations(){this.sortExpandInformations();const e=[];for(let t=0;t<this._expandInformations.length;t++){const i=this._expandInformations[t],s=i.elementParent?this._getElementChildren(i.elementParent):this._data;let l=!1;for(let t=0;t<e.length;t++)l=e[t].element===i.elementParent||l;l||-1===s.indexOf(i.element)?(i.elementChildren=[],e.push(i)):i.elementChildren=this._getElementChildren(i.element)}for(let t=0;t<e.length;t++)this.removeElementFromArray(this._expandInformations,e[t]);this.calculateExpandInformationIndexes()}sortExpandInformations(){const e=[];for(let t=0;t<this._expandInformations.length;t++){const i=this._expandInformations[t];if(i.elementParent){let t=!1,s=!1,l=void 0;for(let n=0;n<e.length;n++){const o=e[n];if(t&&o.elementParent===l.elementParent&&o.elementIndex>i.elementIndex||t&&o.elementParent===i.elementParent&&o.elementIndex>i.elementIndex||t&&o.level<i.level||o.elementParent===i.element){e.splice(n,0,i),s=!0;break}o.element===i.elementParent&&(t=!0),l=o}s||e.push(i)}else{let t=!1;for(let s=0;s<e.length;s++){const l=e[s];if(!l.elementParent&&l.elementIndex>i.elementIndex||l.elementParent===i.element){e.splice(s,0,i),t=!0;break}}t||e.push(i)}}this._expandInformations=e}calculateExpandInformationIndexes(){let e=[],t=void 0,i=0;for(let s=0;s<this._expandInformations.length;s++){const l=this._expandInformations[s];if(!l.active)continue;t&&(l.level>t.level&&e.push(t),l.level<t.level&&(e=e.slice(0,e.length-(t.level-l.level)))),l.totalLength=l.elementChildren.length;for(let t=0;t<e.length;t++)e[t].totalLength+=l.totalLength;const n=e.length>0?e[e.length-1]:void 0,o=n?n.index:void 0,r=n?n.totalLength-l.totalLength:0,h=n?n.elementChildren.length:0,d=e&&e.length>0?e[e.length-1].elementChildren.indexOf(l.element):this._data.indexOf(l.element),a=r-h+d+(void 0!==o?o+1:0)+(1===l.level?i:0);l.elementIndex=d,l.index=a,t=l,i+=l.elementChildren.length}this.updateCurrentMaxIndex()}rAF(e,t){const i=[].slice.call(arguments,2);this.virtualEnvironment?e.apply(this,i):t?(this._frameRequests[t]&&window.cancelAnimationFrame(this._frameRequests[t]),this._frameRequests[t]=window.requestAnimationFrame(()=>{e.apply(this,i),delete this._frameRequests[t]})):window.requestAnimationFrame(()=>e.apply(this,i))}removeElementFromArray(e,t){const i=e?e.indexOf(t):-1;return i>-1?e.splice(i,1):void 0}}export default MNSTR;
