if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js', {scope: './'}).then(function() {
        // Registration was successful. Now, check to see whether the service worker is controlling the page.
        if (navigator.serviceWorker.controller) {
            // If .controller is set, then this page is being actively controlled by the service worker.
            console.log('The service worker is currently handling network operations. ' +
                'If you reload the page, the images (and everything else) will be served from the service worker\'s cache.');

            cachedUrlList();
            addLinkButtons();

            sendMessage({
                command: 'prefetch',
                urls: scrapeUrls()
            });
        } else {
            // If .controller isn't set, then prompt the user to reload the page so that the service worker can take
            // control. Until that happens, the service worker's fetch handler won't be used.
            console.log('Please reload this page to allow the service worker to handle network operations.');
        }
    }).catch(function(error) {
        // Something went wrong during registration. The service-worker.js file
        // might be unavailable or contain a syntax error.
        console.error(error);
    });
} else {
    // The current browser doesn't support service workers.
    console.log('Service workers are not supported in the current browser.');
}

// function urlsToPrefetch() {
//     var links = self.document.querySelectorAll('a');
//     var regex = new RegExp('^' + self.location.origin);

//     return [].slice.call(links).map(function(link) {
//         return link.href.replace(regex, '');
//     });
// }

function cachedUrlList() {
    //make ul element
    var ulElement = document.createElement('ul');
    var ulAtt = document.createAttribute("id");
    ulAtt.value = "contents";
    ulElement.setAttributeNode(ulAtt);
    //hackiest inline style
    var style = document.createElement('style');
    style.setAttribute("style", "float:left;");
    divElement.appendChild(style);
    //make div "list" element
    var buttonElement = document.createElement('button');
    var buttonAtt = document.createAttribute("id");
    buttonAtt.value = "list-contents";
    buttonElement.setAttributeNode(buttonAtt);
    buttonElement.textContent = 'Cached URLs';
    var divElement = document.createElement('div');
    var offlineSidebar = document.querySelector('#index-panels');
    //add element to index panels
    divElement.appendChild(buttonElement);
    divElement.appendChild(ulElement);
    offlineSidebar.appendChild(divElement);
    document.querySelector('#list-contents').addEventListener('click', function() {
        sendMessage({
            command: 'keys'
        }).then(function(data) {
             var contentsElement = document.querySelector('#contents');
            // Clear out the existing items from the list.
            while (contentsElement.firstChild) {
            contentsElement.removeChild(contentsElement.firstChild);
            }
            // Add each cached URL to the list, one by one.
            data.urls.forEach(function(url) {
                var liElement = document.createElement('li');
                liElement.textContent = url;
                contentsElement.appendChild(liElement);
            });
        });
    });
}

function sendMessage(message) {
    // This wraps the message posting/response in a promise, which will resolve if the response doesn't
    // contain an error, and reject with the error if it does. If you'd prefer, it's possible to call
    // controller.postMessage() and set up the onmessage handler independently of a promise, but this is
    // a convenient wrapper.
    return new Promise(function(resolve, reject) {
        var messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = function(event) {
            if (event.data.error) {
                reject(event.data.error);
            } else {
                resolve(event.data);
            }
        };
        // This sends the message data as well as transferring messageChannel.port2 to the service worker.
        // The service worker can then use the transferred port to reply via postMessage(), which
        // will in turn trigger the onmessage handler on messageChannel.port1.
        // See https://html.spec.whatwg.org/multipage/workers.html#dom-worker-postmessage
        navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
    });
}

function scrapeUrls() {
	var selectors = [
		'#index-panels .panel-1 .column--single',
		'#index-panels .container--primary-and-secondary-columns .column--primary .container-pigeon',
		'#index-panels .panel-1 .container--primary-and-secondary-columns div.column--primary .distinct-component-group.container-macaw'
	];

	var urlsScraped = [];

	for (var i = 0; i < selectors.length; i++) {
		var selectedHrefs = document.querySelectorAll(selectors[i] + ' a[href^="/?path"]');
		for (var x = 0; x < selectedHrefs.length; x++) {
			var url = selectedHrefs[x].href;
			console.log(url);
			if (urlsScraped.indexOf(url) === -1) {
				urlsScraped.push(url);
			}
		}
	}

	return urlsScraped;
}

function addLinkButtons() {
    // Add 'save for later' buttons to each link on the page
    var links = document.querySelectorAll('#page a');
    var button = document.createElement('a');

    [].slice.call(links).filter(function(link) {
        return link.href.match(/\/news\/.+-[0-9]+/);
    }).forEach(function(link) {
        var b = button.cloneNode();

        b.title = 'Download this article to read later';
        b.innerHTML = ' [ + ]'.replace(' ', '&nbsp');
        b.addEventListener('click', addLinkToCache);

        link.appendChild(b);
    });

    function addLinkToCache(event) {
        var link = event.target;

        sendMessage({
            command: 'prefetch',
            urls: [link.href]
        }).then(function() {
            link.textContent = ' [ ✓ ]';
        });

        event.preventDefault();
    }
}
