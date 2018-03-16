function getRendererSimple (element, data, list, deleteable, customActionLabel, customActionCallback) {
	var rootNode = document.createElement('div');
	rootNode.classList.add('itemRenderer1');

	var avatarWrapperNode = document.createElement('div');
	avatarWrapperNode.classList.add('avatar');
	var avatarNode = document.createElement('img');
	avatarNode.src = element.avatar;
	avatarWrapperNode.appendChild(avatarNode);
	rootNode.appendChild(avatarWrapperNode);

	var contentNode = document.createElement('div');
	contentNode.classList.add('main-content');

	var headlineNode = document.createElement('div');
	headlineNode.classList.add('headline');

	var authorNode = document.createElement('div');
	authorNode.classList.add('author');
	authorNode.innerHTML = element.name;
	headlineNode.appendChild(authorNode);

	var idNode = document.createElement('div');
	idNode.classList.add('id');
	idNode.innerHTML = '#' + element.directId;
	headlineNode.appendChild(idNode);
	contentNode.appendChild(headlineNode);

	var textNode = document.createElement('div');
	textNode.classList.add('text');
	textNode.innerHTML = element.text;
	contentNode.appendChild(textNode);

	var actionsNode = document.createElement('div');
	actionsNode.classList.add('actions');

	if (element.children && element.children.length > 0) {
		var label = element.children.length === 1
			? element.children.length + ' answer'
			: element.children.length + ' answers';

		var expandNode = document.createElement('div');
		expandNode.classList.add('action', 'expand-answers');
		expandNode.innerHTML = label;
		expandNode.addEventListener('click', function (e) {
			list.toggleExpandElement(element);
		}.bind(list));
		actionsNode.appendChild(expandNode);
	}

	if (deleteable) {
		var deleteNode = document.createElement('div');
		deleteNode.classList.add('action', 'delete-post');
		deleteNode.innerHTML = 'Delete post';
		deleteNode.addEventListener('click', function (e) {
			data.splice(data.indexOf(element), 1);
			list.dataUpdated();
		}.bind(list));
		actionsNode.appendChild(deleteNode);
	}

	if (customActionLabel && customActionCallback) {
		var customActionNode = document.createElement('div');
		customActionNode.classList.add('action');
		customActionNode.innerHTML = customActionLabel;
		customActionNode.addEventListener('click', function () {
			customActionCallback(rootNode);
		});
		actionsNode.appendChild(customActionNode);
	}

	contentNode.appendChild(actionsNode);
	rootNode.appendChild(contentNode);

	return rootNode;
}

function getRendererLoader (element) {
	return [
		'<div class="itemRendererLoader">',
			'<div class="label">' + element.label + '</div>',
		'</div>'
	].join('\n');
}

function getRendererResizing (element, list) {
	return getRendererSimple(element, undefined, list, false, 'Resize', function (node) {
		node.classList.contains('resized')
			? node.classList.remove('resized')
			: node.classList.add('resized');
	});
}
