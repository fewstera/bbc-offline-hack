if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' }).then(function() {
        // Registration was successful. Now, check to see whether the service worker is controlling the page.
        if (navigator.serviceWorker.controller) {
            // If .controller is set, then this page is being actively controlled by the service worker.
            console.log('The service worker is currently handling network operations. ' +
                'If you reload the page, the images (and everything else) will be served from the service worker\'s cache.');

            sendMessage({
                command: 'prefetch',
                urls: urlsToPrefetch()
            }).then(function() {
                prefetchMainImages();
                addLinkButtons();
            });

            cachedUrlList();
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

function cachedUrlList() {

// most-popular__title

    var wrapper = document.createElement('div');
    var wrapperClass = document.createAttribute("class");
    wrapperClass.value = "most-popular";
    wrapper.setAttributeNode(wrapperClass);
    var title = document.createElement('h2');
    var titleClass = document.createAttribute("class");
    titleClass.value = "most-popular__title";
    title.setAttributeNode(titleClass);
    title.textContent = "Offline Content";
    wrapper.appendChild(title);

    var ulElement = document.createElement('ul');
    var ulAtt = document.createAttribute("id");
    ulAtt.value = "contents";
    ulElement.setAttributeNode(ulAtt);
    var ulClass = document.createAttribute("class");
    ulClass.value = "most-popular__list panel-read collection";
    ulElement.setAttributeNode(ulClass);

    var buttonElement = document.createElement('button');
    var buttonAtt = document.createAttribute("id");
    buttonAtt.value = "list-contents";
    buttonElement.setAttributeNode(buttonAtt);

    var buttonAtt2 = document.createAttribute("class");
    buttonAtt2.value = "most-popular-by-day__subtitle";
    buttonElement.setAttributeNode(buttonAtt2);
    buttonElement.textContent = "Show Url's";

    var containerDiv = document.createElement('div');
    var containerDivClass = document.createAttribute("class");
    containerDivClass.value = "most-popular-by-day__list-outer";
    containerDiv.setAttributeNode(containerDivClass);

    var offlineSidebar = document.querySelector('.column--secondary');
    //add element to index panels
    containerDiv.appendChild(buttonElement);
    containerDiv.appendChild(ulElement);
    wrapper.appendChild(containerDiv);
    offlineSidebar.appendChild(wrapper);
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
            filterArticleLinks(data.urls).forEach(function(url) {

                var liElement = document.createElement('li');
                var liClass = document.createAttribute("class");
                liClass.value = "most-popular-list-item__link ";
                liElement.setAttributeNode(liClass);
                var aElement = document.createElement('a');
                var hrefAtt = document.createAttribute("href");
                hrefAtt.value = url;
                aElement.setAttributeNode(hrefAtt);
                var regex = new RegExp('^' + self.location.origin);
                var urlHref = url.replace(regex, '');
                var currentArticle = document.querySelector('#page a[href="'+urlHref+'"]');
                var currentArticleTitle = currentArticle.textContent.replace('[ + ]', '');

                var containerDiv = document.createElement('div');
                var containerDivClass = document.createAttribute("class");
                containerDivClass.value = "most-popular-by-day__list-outer";
                containerDiv.setAttributeNode(containerDivClass);

                var urlTitleClass = document.createAttribute("class");
                urlTitleClass.value = "most-popular-list-item__headline";
                aElement.setAttributeNode(urlTitleClass);
                aElement.textContent = currentArticleTitle;
                liElement.appendChild(aElement);
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

function urlsToPrefetch() {
    var links = self.document.querySelectorAll('#page a[href^="/news/"]');

    return filterArticleLinks(links).map(function(link) {
        return link.href;
    }).filter(function(url, i, arr) {
        // Filter for unique URLs
        return arr.indexOf(url) === i;
    }).slice(0, 10);
}

function filterArticleLinks(links) {
    return [].slice.call(links).filter(function(link) {
        var url = (typeof link === 'string') ? link : link.href;
        return url.match(/\/news\/[^0-9]+-[0-9]+/);
    });
}

function addLinkButtons() {
    var toggleButtonCached = function(button, cached) {
        if (cached) {
            button.title = 'This article is available offline';
            button.textContent = ' [ ✓ ]';
            button.removeEventListener('click', addLinkToCache);
        } else {
            button.title = 'Download this article to read later';
            button.textContent = ' [ + ]';
            button.addEventListener('click', addLinkToCache);
        }
    };

    function addLinkToCache(event) {
        var link = event.target;

        link.textContent = ' [...]';

        sendMessage({
            command: 'prefetch',
            urls: [link.parentNode.href]
        }).then(function() {
            toggleButtonCached(link, true);
        });

        event.preventDefault();
    }

    sendMessage({
        command: 'keys'
    }).then(function(data) {
        // Add 'save for later' buttons to each link on the page
        var links = document.querySelectorAll('#page a');

        filterArticleLinks(links).forEach(function(link) {
            var b = link.querySelector('.add-to-cache');

            if (!b) {
                b = document.createElement('a');
                b.className = 'add-to-cache';
                b.setAttribute('style', 'white-space: nowrap;')
            }

            if (data.urls.indexOf(link.href) !== -1) {
                // Link is already cached
                toggleButtonCached(b, true);
            } else {
                toggleButtonCached(b, false);
            }

            link.appendChild(b);
        });
    });
}

function prefetchMainImages() {
    sendMessage({
        command: 'keys'
    }).then(function(data) {
        var promises = [];

        filterArticleLinks(data.urls).forEach(function(url) {
            var p = new Promise(function(resolve, reject) {
                $.get(url).success(function(html) {
                    var $html = $(html);
                    var image = $('figure img', $html).first();

                    if (image.length) {
                        resolve(image.attr('src').replace('/200/', '/660/'));
                    } else {
                        resolve(null);
                    }
                });
            });

            promises.push(p);
        });

        Promise.all(promises).then(function(imgSrcs) {
            imgSrcs = imgSrcs.filter(function(src) {
                return src !== null;
            });

            sendMessage({
                command: 'prefetch',
                urls: imgSrcs
            }).then(function() {
                console.log('Prefetched main images for cached articles');
            });
        });
    });
}
