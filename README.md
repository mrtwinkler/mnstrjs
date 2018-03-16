![alt text](/logo.png "mnstr.js")

# What?
MNSTR is designed to render large lists of data in no time by only rendering what is actually visible in the viewport (like UITableView, for example). Unlike other approaches in javascript, it does not require you to provide cell heights and keeps the amount of DOM elements as low as possible. It is completely written in ES5. There will be an ES6/ES8 port, but I don't know when. The library is still under development and may have bugs. Use at your own risk.

# Specs
* no dependencies
* native browser scrolling
* support for tree data
* responsive
* 14kb minified, 5kb gzipped

# Setup
Package managers, cdns and whatsoever are yet to come. Until then, just download the file in `/dist` and do:
```html
<script type="text/javascript" src="mnstr.min.js"></script>
```

# Usage
There are some examples for different situations to be found at `/examples`. However, basically they all do something like this:

**Javascript**

```javascript
var list = new MNSTR({
	parentNode: document.body,
	getData: function () {
		return ['The', 'quick', 'brown', ...];
	},
	getCellRenderer: function (element) {
		var node = document.createElement('span');
		node.innerHTML = element;
		return node;
	}
});
```
**CSS**

```css
.mnstr {
	width: 100%;
	height: 100%;
}
```
**Important:** You __need__ to set `height` or `max-height` of the list, or else it will just render all your data, not only what is its viewport. Also make sure that by the time the list renders (either when it is initialized or by calling `render()`), its parent is part of the DOM. Otherwise the list can not measure its or its cell heights.

# Options
name|type|default|description
---|---|---|---
context|object|list|The context that callbacks are called in.
parentNode|HTMLElement|document.body|The DOM node this list will be appended to.
className|string|monsterlist|CSS classname of the list and also the namespace for its children (e.g. monsterlist-cell for the cells).
renderOnInitialize|bool|true|If true, the list will automatically be rendered when initialized. if false, use render() to render the list manually.
initialScrollToElement|object|-|Set the element (of your data) to which the list will automatically scroll when rendered the first time.
observeCellBounds|bool|false|If true, an iFrame will be used for each cell to observe if the bounds change. Use this, if cell bounds are highly volatile. Caution: iFrame rendering is very expensive. This might cause initial rendering delays.
preventWheelBubbling|bool|false|If true, parent containers will not scroll if the wheel-event is triggered on this list.
rememberChildrenExpands|bool|true|If set and an expanded node, which has children that are also expanded, is collapsed and re-expanded, the children will be re-expanded, too.
updateThresholdRatio|float|0.5|Ratio (proportional to the list height) at which the top and bottom update thresholds will be placed. Higher means more cells will be rendered at a time.
useTransform|bool|true|Use `transform` instead of `top` to position cells. When using transform (default), z-index will break when trying to overlap subsequent cells. Using top will negatively impact performance, since we don't render cells on their own layer anymore.

# Methods
name|parameter types|description
---|---|---
render(parentNode)|HTMLElement (optional)|If `renderOnInitialize` is false, call this method to render the list. Make sure that by the time calling, the parent node is part of the DOM.
addEventListener(event, listener)|string, function|Subscribe to an event. See the events section below for a list of available events.
removeEventListener(event, listener)|string, function|Unsubscribe from an event.
getNode()||Returns the root HTMLElement of the list.
dataUpdated()||Call this every time your data has been updated. The list will automatically fetch the updated data and update itself accordingly.
cellBoundsUpdated()||Unless `observeCellBounds` is true, you need to call this every time a cell manually (not by resizing the whole list) changed its bounds. The list will then reposition all cells accordingly.
expandElement(element)|object|Expands an element and exposes its children, fetched by `getElementChildren` directly below the elements cell.
collapseElement(element)|object|Does the opposite of the method above.
toggleExpandElement(element)|object|Toggle the things above.
isElementExpanded(element)|object|Returns the current expand state of an element.
destroy()||Not implemented yet. But it should be, right?

# Callbacks
Pass callbacks along with `args` when initializing the list, as in the example above.
name|return type|description
---|---|---
getData(list)|array|**Required**. If you want to display something and not to crash anything.
getCellRenderer(element, index, isExpanded, list)|HTMLElement or string|**Required**. Unless you still don't want to display anything.
getElementChildren(element, list)|array|Optional. Used for tree data.

# Events
All events are also available as callbacks. For the sake of DRY they are not listed separately.
name|parameters|description
---|---|---
didRenderFirstElement|element, list|Triggered every time the first element of your data is rendered.
didRenderLastElement|element, list|Triggered every time the last element of your data is rendered.

# Tree data
The list is capable of handling tree data (see examples for a demo). Each cell has a `data-level` attribute, which indicates the level of the element. Root elements are level 0, their children are level 1 and so on. If there is a need to visualize a hierarchy, you can set styles for each level like this:

```css
.mnstr-cell[data-level="1"] .myCellRenderer {
	padding-left: 25px;
}
.mnstr-cell[data-level="2"] .myCellRenderer {
	padding-left: 50px;
}
```
Remember that `.mnstr` is the default CSS class name / namespace. You can always provide another class name, if you wish. See options for details.

# Compatibility
All mature browsers and IE11+.

# Downsides
None. Well, actually, there is one. MNSTR does not calculate its height by provided cell heights, it estimates by averages. When cell renderers have different heights, this might lead to scrollbar jumping at the end or the beginning of the list, as these are the moments where the deviations between estimating and the real world are corrected.

# Limits
The browsers have a height limitation on DOM elements, it means that currently the list cannot display more than ~500k items depending on the browser.

`Blink deferred a task [...]`. When using MNSTR you may come across this (Chrome) or a similar warning. See https://stackoverflow.com/a/37367801/258931 on how to track if your cell renderers might be a cause for that. But don't panic. At least Chrome likes to trigger this warning even if there are no events taking more than 5ms.

**General rule**: Try to keep your cell renderers and the initialization of them as simple as possible. Try to test your list on slow devices or use cpu throttling.

# Todo
* ES8
* destroy()
* Some wrappers for react, vue, etc.

# License
MIT
