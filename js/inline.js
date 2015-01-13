if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js', {scope: './'}).then(function() {
        // Registration was successful. Now, check to see whether the service worker is controlling the page.
        if (navigator.serviceWorker.controller) {
            // If .controller is set, then this page is being actively controlled by the service worker.
            console.log('The service worker is currently handling network operations. ' +
                'If you reload the page, the images (and everything else) will be served from the service worker\'s cache.');

            // REEL SHIT
            urlsToPrefetch().forEach(function(url) {
                sendMessage({
                    command: 'prefetch',
                    url: url
                });
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

function urlsToPrefetch() {
    var links = self.document.querySelectorAll('a');
    var regex = new RegExp('^' + self.location.origin);

    return [].slice.call(links).map(function(link) {
        return link.href.replace(regex, '');
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
