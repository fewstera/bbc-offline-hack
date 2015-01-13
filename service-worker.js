importScripts('./serviceworker-cache-polyfill.js');

var CACHE_VERSION = 1;
var CURRENT_CACHES = {
    'read-through': 'read-through-cache-v' + CACHE_VERSION
};

console.log(self);

self.addEventListener('activate', function(event) {
    // Delete all caches that aren't named in CURRENT_CACHES.
    // While there is only one cache in this example, the same logic will handle the case where
    // there are multiple versioned caches.
    var expectedCacheNames = Object.keys(CURRENT_CACHES).map(function(key) {
        return CURRENT_CACHES[key];
    });

    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (expectedCacheNames.indexOf(cacheName) == -1) {
                        // If this cache name isn't present in the array of "expected" cache names, then delete it.
                        console.log('Deleting out of date cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('message', function(event) {
    console.log('Handling message event:', event);

    caches.open(CURRENT_CACHES['read-through']).then(function(cache) {
        switch (event.data.command) {
            case 'prefetch':
                var urls = event.data.urls,
                    requests = [];

                for (var i = 0; i < urls.length; i++) {
                    requests.push(new Request(urls[i], {mode: 'no-cors'}));
                }
                cache.addAll(requests).then(function() {
                    for (var i = 0; i < urls.length; i++) {
                        console.log('URL fetched and cached:', urls[i]);
                    }
                    event.ports[0].postMessage({
                        error: null
                    });
                });
                break;

             case 'keys':
                cache.keys().then(function(requests) {
                  var urls = requests.map(function(request) {
                    return request.url;
                  });

                  // event.ports[0] corresponds to the MessagePort that was transferred as part of the controlled page's
                  // call to controller.postMessage(). Therefore, event.ports[0].postMessage() will trigger the onmessage
                  // handler from the controlled page.
                  // It's up to you how to structure the messages that you send back; this is just one example.
                  event.ports[0].postMessage({
                    error: null,
                    urls: urls.sort()
                  });
                });
              break;
              
            default:
                // This will be handled by the outer .catch().
                throw 'Unknown command: ' + event.data.command;
        }
    });
});

// This sample illustrates an aggressive approach to caching, in which every valid response is
// cached and every request is first checked against the cache.
// This may not be an appropriate approach if your web application makes requests for
// arbitrary URLs as part of its normal operation (e.g. a RSS client or a news aggregator),
// as the cache could end up containing large responses that might not end up ever being accessed.
// Other approaches, like selectively caching based on response headers or only caching
// responses served from a specific domain, might be more appropriate for those use cases.
self.addEventListener('fetch', function(event) {
    console.log('Handling fetch event for', event.request.url);

    event.respondWith(
        caches.open(CURRENT_CACHES['read-through']).then(function(cache) {
            return cache.match(event.request).then(function(response) {
                if (response) {
                    // If there is an entry in the cache for event.request, then response will be defined
                    // and we can just return it.
                    console.log(' Found response in cache:', response);

                    return response;
                } else {
                    // Otherwise, if there is no entry in the cache for event.request, response will be
                    // undefined, and we need to fetch() the resource.
                    console.log(' No response for %s found in cache. About to fetch from network...', event.request.url);

                    // We call .clone() on the request since we might use it in the call to cache.put() later on.
                    // Both fetch() and cache.put() "consume" the request, so we need to make a copy.
                    // (see https://fetch.spec.whatwg.org/#dom-request-clone)
                    return fetch(event.request.clone()).then(function(response) {
                        console.log('    Response for %s from network is: %O', event.request.url, response);

                        // Optional: add in extra conditions here, e.g. response.type == 'basic' to only cache
                        // responses from the same domain. See https://fetch.spec.whatwg.org/#concept-response-type
                        if (response.status < 400) {
                            // This avoids caching responses that we know are errors (i.e. HTTP status code of 4xx or 5xx).
                            // One limitation is that, for non-CORS requests, we get back a filtered opaque response
                            // (https://fetch.spec.whatwg.org/#concept-filtered-response-opaque) which will always have a
                            // .status of 0, regardless of whether the underlying HTTP call was successful. Since we're
                            // blindly caching those opaque responses, we run the risk of caching a transient error response.
                            //
                            // We need to call .clone() on the response object to save a copy of it to the cache.
                            // (https://fetch.spec.whatwg.org/#dom-request-clone)
                            cache.put(event.request, response.clone());
                        }

                        // Return the original response object, which will be used to fulfill the resource request.
                        return response;
                    });
                }
            }).catch(function(error) {
                // This catch() will handle exceptions that arise from the match() or fetch() operations.
                // Note that a HTTP error response (e.g. 404) will NOT trigger an exception.
                // It will return a normal response object that has the appropriate error code set.
                console.error('    Read-through caching failed:', error);

                throw error;
            });
        })
    );
});
